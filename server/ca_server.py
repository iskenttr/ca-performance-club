#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import shutil
import threading
import time
import uuid
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlencode, urlparse
from zoneinfo import ZoneInfo

from logmeal import (
    MealAnalysisError,
    analyze_image,
    decode_image_payload,
    issue_analysis_token,
    read_analysis_token,
    recalculate_image,
)

APP_ROOT = Path(os.environ.get('CA_APP_ROOT', '/home/canadmin/apps/ca-performance-club'))
WEB_ROOT = APP_ROOT / 'current'
DATA_DIR = APP_ROOT / 'data'
STATE_FILE = DATA_DIR / 'state.json'
SECRET_FILE = DATA_DIR / 'server.secret'
MEAL_PHOTO_DIR = DATA_DIR / 'meal-photos'
TRAINER_ID = 'trainer-cem-arslanoglu'
TRAINER_EMAIL = 'cem@cemfit.app'
LOCK = threading.RLock()
ISTANBUL = ZoneInfo('Europe/Istanbul')
APPOINTMENT_DURATIONS = (45, 60, 90)
WORKDAY_START_HOUR = 9
WORKDAY_END_HOUR = 21


def credential(user_id, email, password, salt):
    digest = hashlib.sha256(f'{salt}:{password}'.encode()).hexdigest()
    return {'userId': user_id, 'email': email, 'salt': salt, 'passwordHash': digest}


def default_state():
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    return {
        'schemaVersion': 1,
        'users': [{
            'id': TRAINER_ID, 'role': 'trainer', 'fullName': 'Cem Arslanoğlu',
            'email': TRAINER_EMAIL, 'phone': '+90 532 000 00 00', 'title': 'Personal Trainer',
            'bio': 'Sürdürülebilir kuvvet, doğru hareket ve düzenli ilerleme odaklı kişisel antrenörlük.',
            'createdAt': now,
        }],
        'credentials': [credential(TRAINER_ID, TRAINER_EMAIL, 'Cem123!', 'cemfit-trainer-demo')],
        'workoutPrograms': [], 'nutritionPlans': [], 'measurements': [], 'progressPhotos': [],
        'appointments': [], 'appointmentBlocks': [], 'messages': [], 'workoutCompletions': [], 'mealEntries': [],
    }


def ensure_storage():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MEAL_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(MEAL_PHOTO_DIR, 0o700)
    if not SECRET_FILE.exists():
        SECRET_FILE.write_text(secrets.token_hex(48), encoding='utf-8')
        os.chmod(SECRET_FILE, 0o600)
    if not STATE_FILE.exists():
        save_state(default_state())


def load_state():
    with LOCK:
        state = json.loads(STATE_FILE.read_text(encoding='utf-8'))
        state.setdefault('mealEntries', [])
        state.setdefault('appointmentBlocks', [])
        return state


def save_state(state):
    with LOCK:
        state.setdefault('mealEntries', [])
        state.setdefault('appointmentBlocks', [])
        temp = STATE_FILE.with_suffix('.tmp')
        temp.write_text(json.dumps(state, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        temp.replace(STATE_FILE)


def normalized_email(value):
    return str(value or '').strip().lower()


def verify(cred, password):
    candidate = hashlib.sha256(f"{cred['salt']}:{password}".encode()).hexdigest()
    return hmac.compare_digest(candidate, cred.get('passwordHash', ''))


def secret_key():
    return SECRET_FILE.read_bytes().strip()


def issue_token(user_id):
    payload = json.dumps({'uid': user_id}, separators=(',', ':')).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b'=')
    signature = hmac.new(secret_key(), encoded, hashlib.sha256).digest()
    return f"{encoded.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def read_token(value):
    try:
        encoded, signature = value.split('.', 1)
        expected = hmac.new(secret_key(), encoded.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(signature + '=' * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
        # Oturum kullanıcı açıkça çıkış yapana kadar geçerlidir. Eski süreli
        # belirteçler de bu sürümden itibaren süre kontrolü olmadan kabul edilir.
        return payload.get('uid')
    except Exception:
        return None


def item_student_id(item):
    return item.get('studentId')


def issue_photo_token(requester_id, meal_id):
    payload = json.dumps({
        'uid': requester_id,
        'mealId': meal_id,
        'exp': int(time.time()) + 60 * 60,
    }, separators=(',', ':')).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b'=')
    signature = hmac.new(secret_key(), encoded, hashlib.sha256).digest()
    return f"{encoded.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def read_photo_token(value):
    try:
        encoded, signature = value.split('.', 1)
        expected = hmac.new(secret_key(), encoded.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(signature + '=' * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
        return payload if payload.get('exp', 0) >= time.time() else None
    except Exception:
        return None


def public_meal_entry(item, requester_id):
    public_item = {key: value for key, value in item.items() if key != 'photoPath'}
    token = issue_photo_token(requester_id, item.get('id'))
    public_item['photoUri'] = f"/api/meal-photos/{item.get('id')}?{urlencode({'access': token})}"
    return public_item


COLLECTIONS = ['workoutPrograms', 'nutritionPlans', 'measurements', 'progressPhotos', 'appointments', 'appointmentBlocks', 'messages', 'workoutCompletions']
READ_COLLECTIONS = [*COLLECTIONS, 'mealEntries']


def public_state(state, user_id):
    user = next((u for u in state['users'] if u['id'] == user_id), None)
    if not user:
        return None
    result = {**state, 'credentials': []}
    if user.get('role') == 'trainer':
        result['mealEntries'] = [public_meal_entry(item, user_id) for item in state.get('mealEntries', [])]
        return result
    result['users'] = [u for u in state['users'] if u['id'] in (user_id, TRAINER_ID)]
    for key in READ_COLLECTIONS:
        result[key] = [item for item in state.get(key, []) if item_student_id(item) == user_id]
    result['mealEntries'] = [public_meal_entry(item, user_id) for item in result['mealEntries']]
    return result


def merge_by_id(existing, incoming, incoming_wins=True):
    merged = {item.get('id'): item for item in existing if item.get('id')}
    for item in incoming:
        item_id = item.get('id')
        if item_id and (incoming_wins or item_id not in merged):
            merged[item_id] = item
    return list(merged.values())


def merge_migration(state, incoming):
    state['users'] = merge_by_id(state.get('users', []), incoming.get('users', []))
    known_emails = {normalized_email(c.get('email')) for c in state.get('credentials', [])}
    for cred in incoming.get('credentials', []):
        if normalized_email(cred.get('email')) not in known_emails:
            state['credentials'].append(cred)
            known_emails.add(normalized_email(cred.get('email')))
    for key in COLLECTIONS:
        state[key] = merge_by_id(state.get(key, []), incoming.get(key, []))
    return state


def parse_datetime(value):
    parsed = datetime.fromisoformat(str(value or '').replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timezone is required')
    return parsed


def appointment_overlaps(state, start_at, duration_minutes):
    end_at = start_at + timedelta(minutes=duration_minutes)
    for block in state.get('appointmentBlocks', []):
        try:
            block_start = parse_datetime(block.get('startAt'))
            block_end = parse_datetime(block.get('endAt'))
        except (TypeError, ValueError):
            continue
        if block_end > block_start and start_at < block_end and end_at > block_start:
            return True
    for item in state.get('appointments', []):
        if item.get('status') not in ('pending', 'confirmed'):
            continue
        try:
            item_start = parse_datetime(item.get('startAt'))
            item_end = item_start + timedelta(minutes=int(item.get('durationMinutes') or 0))
        except (TypeError, ValueError):
            continue
        if start_at < item_end and end_at > item_start:
            return True
    return False


def appointment_is_in_working_hours(start_at, duration_minutes):
    local_start = start_at.astimezone(ISTANBUL)
    local_end = local_start + timedelta(minutes=duration_minutes)
    return (
        local_start.weekday() < 6
        and local_start.minute in (0, 30)
        and local_start.second == 0
        and local_start.hour >= WORKDAY_START_HOUR
        and (local_end.hour < WORKDAY_END_HOUR or (local_end.hour == WORKDAY_END_HOUR and local_end.minute == 0))
    )


def available_appointment_slots(state, duration_minutes, days=14):
    now = datetime.now(ISTANBUL)
    slots = []
    for day_offset in range(days):
        day = now.date() + timedelta(days=day_offset)
        if day.weekday() >= 6:
            continue
        cursor = datetime(day.year, day.month, day.day, WORKDAY_START_HOUR, tzinfo=ISTANBUL)
        day_end = datetime(day.year, day.month, day.day, WORKDAY_END_HOUR, tzinfo=ISTANBUL)
        while cursor + timedelta(minutes=duration_minutes) <= day_end:
            if cursor > now + timedelta(minutes=30) and not appointment_overlaps(state, cursor, duration_minutes):
                slots.append(cursor.isoformat())
            cursor += timedelta(minutes=30)
    return slots


class Handler(BaseHTTPRequestHandler):
    server_version = 'CAPerformance/1.0'

    def log_message(self, fmt, *args):
        message = re.sub(r'(/api/meal-photos/[^? ]+)\?[^ ]+', r'\1?[redacted]', fmt % args)
        print(f"{self.address_string()} - {message}", flush=True)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def body_json(self):
        length = int(self.headers.get('Content-Length', '0'))
        if length > 25 * 1024 * 1024:
            raise ValueError('İstek çok büyük.')
        return json.loads(self.rfile.read(length) or b'{}')

    def current_user_id(self):
        header = self.headers.get('Authorization', '')
        return read_token(header[7:]) if header.startswith('Bearer ') else None

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        if path == '/api/health':
            return self.send_json(200, {'ok': True})
        if path == '/api/state':
            user_id = self.current_user_id()
            if not user_id:
                return self.send_json(401, {'error': 'Oturum süresi doldu. Yeniden giriş yap.'})
            data = public_state(load_state(), user_id)
            return self.send_json(200, data) if data else self.send_json(401, {'error': 'Hesap bulunamadı.'})
        if path == '/api/appointments/availability':
            return self.appointment_availability(parse_qs(parsed_url.query))
        if path.startswith('/api/meal-photos/'):
            return self.serve_meal_photo(path.rsplit('/', 1)[-1], parse_qs(parsed_url.query).get('access', [''])[0])
        return self.serve_static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            payload = self.body_json()
        except Exception:
            return self.send_json(400, {'error': 'Geçersiz istek.'})
        if path == '/api/login':
            return self.login(payload)
        if path == '/api/register':
            return self.register(payload)
        if path == '/api/migrate':
            return self.migrate(payload)
        if path == '/api/appointments':
            return self.book_appointment(payload)
        if path == '/api/meals/analyze':
            return self.analyze_meal(payload)
        if path == '/api/meals/recalculate':
            return self.recalculate_meal(payload)
        if path == '/api/meals':
            return self.save_meal(payload)
        return self.send_json(404, {'error': 'Bulunamadı.'})

    def do_PUT(self):
        if urlparse(self.path).path != '/api/state':
            return self.send_json(404, {'error': 'Bulunamadı.'})
        user_id = self.current_user_id()
        if not user_id:
            return self.send_json(401, {'error': 'Oturum süresi doldu. Yeniden giriş yap.'})
        try:
            incoming = self.body_json()
        except Exception:
            return self.send_json(400, {'error': 'Geçersiz veri.'})
        with LOCK:
            state = load_state()
            user = next((u for u in state['users'] if u['id'] == user_id), None)
            if not user:
                return self.send_json(401, {'error': 'Hesap bulunamadı.'})
            if user.get('role') == 'trainer':
                credentials = state['credentials']
                meal_entries = state['mealEntries']
                state = {**state, **incoming, 'credentials': credentials, 'mealEntries': meal_entries, 'schemaVersion': 1}
            else:
                incoming_user = next((u for u in incoming.get('users', []) if u.get('id') == user_id), None)
                if incoming_user:
                    safe_user = {
                        **incoming_user,
                        'id': user['id'],
                        'role': 'student',
                        'trainerId': TRAINER_ID,
                        'status': user.get('status', 'new'),
                        'createdAt': user.get('createdAt'),
                    }
                    state['users'] = [safe_user if u['id'] == user_id else u for u in state['users']]
                for key in COLLECTIONS:
                    state[key] = [x for x in state.get(key, []) if item_student_id(x) != user_id]
                    state[key].extend([x for x in incoming.get(key, []) if item_student_id(x) == user_id])
            save_state(state)
        return self.send_json(200, {'ok': True})

    def do_DELETE(self):
        if urlparse(self.path).path != '/api/account':
            return self.send_json(404, {'error': 'Bulunamadı.'})
        user_id = self.current_user_id()
        if not user_id:
            return self.send_json(401, {'error': 'Oturum süresi doldu.'})
        with LOCK:
            state = load_state()
            user = next((u for u in state['users'] if u['id'] == user_id), None)
            if not user or user.get('role') == 'trainer':
                return self.send_json(403, {'error': 'Eğitmen hesabı silinemez.'})
            state['users'] = [u for u in state['users'] if u['id'] != user_id]
            state['credentials'] = [c for c in state['credentials'] if c['userId'] != user_id]
            for key in READ_COLLECTIONS:
                state[key] = [x for x in state.get(key, []) if item_student_id(x) != user_id]
            save_state(state)
            shutil.rmtree(MEAL_PHOTO_DIR / user_id, ignore_errors=True)
        return self.send_json(200, {'ok': True})

    def login(self, payload):
        email = normalized_email(payload.get('email'))
        password = str(payload.get('password') or '')
        state = load_state()
        cred = next((c for c in state['credentials'] if normalized_email(c.get('email')) == email), None)
        if not cred or not verify(cred, password):
            return self.send_json(401, {'error': 'E-posta veya şifre hatalı.'})
        token = issue_token(cred['userId'])
        return self.send_json(200, {'token': token, 'userId': cred['userId'], 'data': public_state(state, cred['userId'])})

    def register(self, payload):
        email = normalized_email(payload.get('email'))
        password = str(payload.get('password') or '')
        full_name = str(payload.get('fullName') or '').strip()
        phone = str(payload.get('phone') or '').strip()
        if not email or '@' not in email or not full_name or not phone:
            return self.send_json(400, {'error': 'Ad soyad, telefon ve geçerli e-posta gerekli.'})
        if len(password) < 8:
            return self.send_json(400, {'error': 'Şifre en az 8 karakter olmalı.'})
        with LOCK:
            state = load_state()
            if any(normalized_email(c.get('email')) == email for c in state['credentials']):
                return self.send_json(409, {'error': 'Bu e-posta zaten kayıtlı. Kayıt olmak yerine giriş yap.'})
            user_id = f"student-{uuid.uuid4()}"
            now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            student = {
                'id': user_id, 'role': 'student', 'trainerId': TRAINER_ID, 'status': 'new',
                'fullName': full_name, 'email': email, 'phone': phone,
                'goal': payload.get('goal') or 'Genel sağlık', 'level': payload.get('level') or 'Başlangıç',
                'weeklyGoal': int(payload.get('weeklyGoal') or 3), 'createdAt': now,
            }
            state['users'].append(student)
            state['credentials'].append(credential(user_id, email, password, secrets.token_hex(16)))
            state['messages'].append({
                'id': f"msg-{uuid.uuid4()}", 'studentId': user_id, 'senderId': TRAINER_ID,
                'text': f"CA Performance Club'a hoş geldin {full_name.split()[0]}! Profilini inceleyip programını birlikte netleştireceğiz.",
                'sentAt': now,
            })
            save_state(state)
        token = issue_token(user_id)
        return self.send_json(201, {'token': token, 'userId': user_id, 'data': public_state(state, user_id)})

    def migrate(self, payload):
        incoming = payload.get('data') or {}
        email = normalized_email(payload.get('email'))
        password = str(payload.get('password') or '')
        cred = next((c for c in incoming.get('credentials', []) if normalized_email(c.get('email')) == email), None)
        if not cred or not verify(cred, password):
            return self.send_json(401, {'error': 'E-posta veya şifre hatalı.'})
        user = next((u for u in incoming.get('users', []) if u.get('id') == cred.get('userId')), None)
        if not user or (user.get('role') == 'trainer' and email != TRAINER_EMAIL):
            return self.send_json(403, {'error': 'Hesap aktarılamadı.'})
        with LOCK:
            state = merge_migration(load_state(), incoming)
            save_state(state)
        token = issue_token(cred['userId'])
        return self.send_json(200, {'token': token, 'userId': cred['userId'], 'data': public_state(state, cred['userId'])})

    def appointment_student_id(self):
        user_id = self.current_user_id()
        if not user_id:
            return None, (401, 'Randevu işlemi için yeniden giriş yapmalısın.')
        user = next((item for item in load_state()['users'] if item.get('id') == user_id), None)
        if not user:
            return None, (401, 'Hesap bulunamadı.')
        if user.get('role') != 'student':
            return None, (403, 'Uygun saat seçimi öğrenci hesabıyla kullanılabilir.')
        return user_id, None

    def appointment_availability(self, query):
        _, error = self.appointment_student_id()
        if error:
            return self.send_json(error[0], {'error': error[1]})
        try:
            duration = int(query.get('duration', ['60'])[0])
        except (TypeError, ValueError):
            duration = 0
        if duration not in APPOINTMENT_DURATIONS:
            return self.send_json(400, {'error': 'Ders süresi 45, 60 veya 90 dakika olmalı.'})
        return self.send_json(200, {
            'slots': available_appointment_slots(load_state(), duration),
            'timezone': 'Europe/Istanbul',
        })

    def book_appointment(self, payload):
        user_id, error = self.appointment_student_id()
        if error:
            return self.send_json(error[0], {'error': error[1]})
        try:
            start_at = parse_datetime(payload.get('startAt'))
            duration = int(payload.get('durationMinutes'))
        except (TypeError, ValueError):
            return self.send_json(400, {'error': 'Geçerli bir randevu saati seçmelisin.'})
        if duration not in APPOINTMENT_DURATIONS:
            return self.send_json(400, {'error': 'Ders süresi 45, 60 veya 90 dakika olmalı.'})
        if start_at <= datetime.now(ISTANBUL) + timedelta(minutes=30):
            return self.send_json(400, {'error': 'Randevu en az 30 dakika sonrası için oluşturulabilir.'})
        if start_at > datetime.now(ISTANBUL) + timedelta(days=30):
            return self.send_json(400, {'error': 'Randevu en fazla 30 gün sonrası için oluşturulabilir.'})
        if not appointment_is_in_working_hours(start_at, duration):
            return self.send_json(400, {'error': 'Cem Hoca’nın çalışma saatlerinden birini seçmelisin.'})

        mode = str(payload.get('mode') or 'in_person')
        if mode not in ('in_person', 'online'):
            return self.send_json(400, {'error': 'Ders türü 1’e 1 veya online olmalı.'})
        default_note = 'Online PT dersi' if mode == 'online' else '1’e 1 PT dersi'
        note = str(payload.get('note') or default_note).strip()[:240]
        with LOCK:
            state = load_state()
            if appointment_overlaps(state, start_at, duration):
                return self.send_json(409, {'error': 'Bu saat az önce doldu. Lütfen başka bir saat seç.'})
            appointment = {
                'id': f"appointment-{uuid.uuid4()}",
                'trainerId': TRAINER_ID,
                'studentId': user_id,
                'startAt': start_at.isoformat(),
                'durationMinutes': duration,
                'mode': mode,
                'status': 'pending',
                'note': note,
            }
            state['appointments'].append(appointment)
            save_state(state)
        return self.send_json(201, {'appointment': appointment, 'data': public_state(state, user_id)})

    def meal_student(self):
        user_id = self.current_user_id()
        if not user_id:
            raise MealAnalysisError(401, 'Öğün işlemi için yeniden giriş yapmalısın.')
        user = next((item for item in load_state()['users'] if item.get('id') == user_id), None)
        if not user:
            raise MealAnalysisError(401, 'Hesap bulunamadı.')
        if user.get('role') != 'student':
            raise MealAnalysisError(403, 'Öğün analizi öğrenci hesabıyla kullanılabilir.')
        return user_id

    def logmeal_api_token(self):
        token = os.environ.get('LOGMEAL_API_TOKEN', '').strip()
        if not token:
            raise MealAnalysisError(503, 'Öğün analizi servisi henüz yapılandırılmamış.')
        return token

    def send_meal_error(self, error):
        return self.send_json(error.status, {'error': error.message})

    def analyze_meal(self, payload):
        try:
            user_id = self.meal_student()
            image, mime_type, extension = decode_image_payload(payload)
            result, quantities = analyze_image(image, mime_type, extension, self.logmeal_api_token())
            result['analysisToken'] = issue_analysis_token(
                secret_key(), user_id, result, quantities, hashlib.sha256(image).hexdigest(),
            )
            return self.send_json(200, result)
        except MealAnalysisError as exc:
            return self.send_meal_error(exc)

    def recalculate_meal(self, payload):
        try:
            user_id = self.meal_student()
            signed = read_analysis_token(secret_key(), str(payload.get('analysisToken') or ''), user_id)
            portion = payload.get('portionGrams')
            if isinstance(portion, bool) or not isinstance(portion, (int, float)):
                raise MealAnalysisError(400, 'Geçerli bir porsiyon gramajı girmelisin.')
            image_id = signed['result'].get('logMealImageId')
            if not isinstance(image_id, int):
                raise MealAnalysisError(400, 'Analiz doğrulanamadı. Fotoğrafı yeniden analiz et.')
            result, quantities = recalculate_image(
                image_id, signed['quantities'], float(portion), self.logmeal_api_token(),
            )
            result['analysisToken'] = issue_analysis_token(
                secret_key(), user_id, result, quantities, signed['imageSha256'],
            )
            return self.send_json(200, result)
        except MealAnalysisError as exc:
            return self.send_meal_error(exc)

    def save_meal(self, payload):
        try:
            user_id = self.meal_student()
            signed = read_analysis_token(secret_key(), str(payload.get('analysisToken') or ''), user_id)
            image, mime_type, _ = decode_image_payload(payload)
            if not hmac.compare_digest(hashlib.sha256(image).hexdigest(), signed['imageSha256']):
                raise MealAnalysisError(400, 'Kaydedilen fotoğraf analiz edilen fotoğrafla eşleşmiyor.')
            meal_type = payload.get('mealType')
            if meal_type not in ('breakfast', 'lunch', 'dinner', 'snack'):
                raise MealAnalysisError(400, 'Geçerli bir öğün tipi seçmelisin.')
            eaten_at = payload.get('eatenAt')
            try:
                datetime.fromisoformat(str(eaten_at).replace('Z', '+00:00'))
            except ValueError as exc:
                raise MealAnalysisError(400, 'Öğün tarihi geçersiz.') from exc
            result = signed['result']
            created_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            meal_id = f"meal-{uuid.uuid4()}"
            student_photo_dir = MEAL_PHOTO_DIR / user_id
            student_photo_dir.mkdir(parents=True, exist_ok=True)
            os.chmod(student_photo_dir, 0o700)
            extension = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}[mime_type]
            photo_path = student_photo_dir / f'{meal_id}.{extension}'
            photo_path.write_bytes(image)
            os.chmod(photo_path, 0o600)
            meal = {
                'id': meal_id,
                'studentId': user_id,
                'eatenAt': eaten_at,
                'mealType': meal_type,
                'photoPath': str(photo_path.relative_to(DATA_DIR)),
                'name': result['name'],
                'foods': result.get('foods', []),
                **({'portionGrams': result['portionGrams']} if result.get('portionGrams') else {}),
                'caloriesKcal': result['caloriesKcal'],
                'proteinG': result['proteinG'],
                'carbsG': result['carbsG'],
                'fatG': result['fatG'],
                'logMealImageId': result['logMealImageId'],
                'logMealDishIds': [
                    item['logMealDishId'] for item in result.get('foods', [])
                    if isinstance(item.get('logMealDishId'), int)
                ],
                'createdAt': created_at,
            }
            with LOCK:
                state = load_state()
                if not any(item.get('id') == user_id and item.get('role') == 'student' for item in state['users']):
                    raise MealAnalysisError(401, 'Hesap bulunamadı.')
                state['mealEntries'].append(meal)
                save_state(state)
            return self.send_json(201, {'meal': public_meal_entry(meal, user_id), 'data': public_state(state, user_id)})
        except MealAnalysisError as exc:
            return self.send_meal_error(exc)

    def serve_meal_photo(self, meal_id, access_token):
        access = read_photo_token(access_token)
        if not access or access.get('mealId') != meal_id:
            return self.send_error(403)
        state = load_state()
        requester = next((item for item in state['users'] if item.get('id') == access.get('uid')), None)
        meal = next((item for item in state.get('mealEntries', []) if item.get('id') == meal_id), None)
        if not requester or not meal:
            return self.send_error(404)
        allowed = requester.get('id') == meal.get('studentId')
        if requester.get('role') == 'trainer':
            student = next((item for item in state['users'] if item.get('id') == meal.get('studentId')), None)
            allowed = bool(student and student.get('trainerId') == requester.get('id'))
        if not allowed:
            return self.send_error(403)
        relative = meal.get('photoPath')
        if not isinstance(relative, str):
            return self.send_error(404)
        candidate = (DATA_DIR / relative).resolve()
        root = MEAL_PHOTO_DIR.resolve()
        if root not in candidate.parents or not candidate.is_file():
            return self.send_error(404)
        body = candidate.read_bytes()
        mime = mimetypes.guess_type(str(candidate))[0] or 'application/octet-stream'
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'private, max-age=300')
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path):
        relative = unquote(path).lstrip('/') or 'index.html'
        candidate = (WEB_ROOT / relative).resolve()
        root = WEB_ROOT.resolve()
        if root not in candidate.parents and candidate != root:
            return self.send_error(403)
        if not candidate.is_file():
            candidate = WEB_ROOT / 'index.html'
        try:
            body = candidate.read_bytes()
        except OSError:
            return self.send_error(404)
        mime = mimetypes.guess_type(str(candidate))[0] or 'application/octet-stream'
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache' if candidate.name == 'index.html' else 'public, max-age=31536000, immutable')
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    ensure_storage()
    port = int(os.environ.get('PORT', '8092'))
    print(f'CA Performance server listening on 127.0.0.1:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
