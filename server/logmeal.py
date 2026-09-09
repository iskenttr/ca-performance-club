import base64
import hashlib
import hmac
import json
import time
import uuid
from urllib import error, parse, request


LOGMEAL_BASE_URL = 'https://api.logmeal.com/v2'
LOGMEAL_LANGUAGE = 'tur'
MAX_IMAGE_BYTES = 6 * 1024 * 1024
ANALYSIS_TOKEN_TTL_SECONDS = 30 * 60


class MealAnalysisError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def decode_image_payload(payload):
    encoded = payload.get('imageBase64')
    if not isinstance(encoded, str) or not encoded.strip():
        raise MealAnalysisError(400, 'Geçerli bir yemek fotoğrafı seçmelisin.')
    encoded = encoded.strip()
    if encoded.startswith('data:'):
        try:
            encoded = encoded.split(',', 1)[1]
        except IndexError as exc:
            raise MealAnalysisError(400, 'Fotoğraf verisi geçersiz.') from exc
    if len(encoded) > (MAX_IMAGE_BYTES * 4 // 3) + 16:
        raise MealAnalysisError(413, 'Fotoğraf en fazla 6 MB olabilir.')
    try:
        image = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError) as exc:
        raise MealAnalysisError(400, 'Fotoğraf verisi geçersiz.') from exc
    if len(image) > MAX_IMAGE_BYTES:
        raise MealAnalysisError(413, 'Fotoğraf en fazla 6 MB olabilir.')
    if len(image) < 100:
        raise MealAnalysisError(400, 'Fotoğraf dosyası geçersiz veya boş.')

    if image.startswith(b'\xff\xd8\xff'):
        mime_type, extension = 'image/jpeg', 'jpg'
    elif image.startswith(b'\x89PNG\r\n\x1a\n'):
        mime_type, extension = 'image/png', 'png'
    elif image.startswith(b'RIFF') and image[8:12] == b'WEBP':
        mime_type, extension = 'image/webp', 'webp'
    else:
        raise MealAnalysisError(400, 'Yalnızca JPEG, PNG veya WebP fotoğraf yükleyebilirsin.')
    return image, mime_type, extension


def _remote_error_message(status):
    if status == 400:
        return 400, 'Fotoğraf LogMeal tarafından geçersiz bulundu.'
    if status in (401, 403):
        return 503, 'Öğün analizi servisi şu anda kullanılamıyor.'
    if status == 404:
        return 422, 'Yemek analizi tamamlanamadı. Başka bir fotoğraf deneyebilirsin.'
    if status == 413:
        return 413, 'Fotoğraf LogMeal için çok büyük.'
    if status == 429:
        return 429, 'Öğün analizi kotası doldu. Lütfen daha sonra tekrar dene.'
    return 502, 'LogMeal şu anda cevap vermiyor. Lütfen daha sonra tekrar dene.'


def _request_json(url, token, *, json_body=None, multipart=None, allow_empty=False):
    headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
    if multipart:
        image, mime_type, extension = multipart
        boundary = f'----CAPerformance{uuid.uuid4().hex}'
        body = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="image"; filename="meal.{extension}"\r\n'
            f'Content-Type: {mime_type}\r\n\r\n'
        ).encode() + image + f'\r\n--{boundary}--\r\n'.encode()
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
    else:
        body = json.dumps(json_body or {}, separators=(',', ':')).encode()
        headers['Content-Type'] = 'application/json'
    req = request.Request(url, data=body, headers=headers, method='POST')
    try:
        with request.urlopen(req, timeout=35) as response:
            raw = response.read()
    except error.HTTPError as exc:
        status, message = _remote_error_message(exc.code)
        raise MealAnalysisError(status, message) from exc
    except (error.URLError, TimeoutError) as exc:
        raise MealAnalysisError(504, 'LogMeal bağlantısı zaman aşımına uğradı. Lütfen tekrar dene.') from exc
    if not raw and allow_empty:
        return {}
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError) as exc:
        raise MealAnalysisError(502, 'LogMeal geçerli bir cevap döndürmedi.') from exc
    if not isinstance(parsed, dict):
        raise MealAnalysisError(502, 'LogMeal cevap biçimi geçersiz.')
    return parsed


def _number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _positive_number(value):
    value = _number(value)
    return value if value is not None and value > 0 else None


def _round(value):
    return round(float(value), 1)


def _nutrient(nutritional_info, code):
    nutrient = (nutritional_info.get('totalNutrients') or {}).get(code)
    if not isinstance(nutrient, dict) or nutrient.get('unit') != 'g':
        return None
    return _number(nutrient.get('quantity'))


def _food_names(nutrition, segmentation):
    names = nutrition.get('foodName')
    if isinstance(names, str) and names.strip():
        return [names.strip()]
    if isinstance(names, list):
        clean = [name.strip() for name in names if isinstance(name, str) and name.strip()]
        if clean:
            return clean
    detected = []
    for segment in segmentation.get('segmentation_results') or []:
        recognition = segment.get('recognition_results') or []
        if recognition and isinstance(recognition[0].get('name'), str):
            detected.append(recognition[0]['name'].strip())
    return [name for name in detected if name]


def parse_logmeal_analysis(segmentation, ingredients, nutrition):
    image_id = segmentation.get('imageId')
    if not isinstance(image_id, int):
        raise MealAnalysisError(502, 'LogMeal cevap biçimi eksik.')
    segments = segmentation.get('segmentation_results')
    if not isinstance(segments, list) or not segments:
        raise MealAnalysisError(422, 'Fotoğrafta yemek tanınamadı. Yemeği daha yakından ve aydınlıkta çekmeyi dene.')

    nutritional_info = nutrition.get('nutritional_info')
    if nutrition.get('hasNutritionalInfo') is False or not isinstance(nutritional_info, dict):
        raise MealAnalysisError(422, 'Yemek tanındı ancak besin değerleri bulunamadı. Başka bir açı deneyebilirsin.')
    calories = _number(nutritional_info.get('calories'))
    if calories is None:
        calories = _number(((nutritional_info.get('totalNutrients') or {}).get('ENERC_KCAL') or {}).get('quantity'))
    protein = _nutrient(nutritional_info, 'PROCNT')
    carbs = _nutrient(nutritional_info, 'CHOCDF')
    fat = _nutrient(nutritional_info, 'FAT')
    if None in (calories, protein, carbs, fat):
        raise MealAnalysisError(422, 'Yemeğin kalori ve makro değerleri eksik döndü. Başka bir fotoğraf deneyebilirsin.')

    names = _food_names(nutrition, segmentation)
    if not names:
        raise MealAnalysisError(422, 'Fotoğrafta yemek tanınamadı. Yemeği daha yakından çekmeyi dene.')

    recipe_items = {
        item.get('food_item_position'): item
        for item in ingredients.get('recipe_per_item') or []
        if isinstance(item, dict) and isinstance(item.get('food_item_position'), int)
    }
    nutrition_items = {
        item.get('food_item_position'): item
        for item in nutrition.get('nutritional_info_per_item') or []
        if isinstance(item, dict) and isinstance(item.get('food_item_position'), int)
    }
    foods = []
    quantities = []
    for segment in segments:
        if not isinstance(segment, dict):
            continue
        position = segment.get('food_item_position')
        recognition = segment.get('recognition_results') or []
        top = recognition[0] if recognition and isinstance(recognition[0], dict) else {}
        recipe_item = recipe_items.get(position, {})
        nutrition_item = nutrition_items.get(position, {})
        name = recipe_item.get('name') or top.get('name')
        if not isinstance(name, str) or not name.strip():
            continue
        portion = _positive_number(recipe_item.get('serving_size')) or _positive_number(nutrition_item.get('serving_size')) or _positive_number(segment.get('serving_size'))
        if portion and isinstance(position, int):
            quantities.append({'position': position, 'grams': portion})
        food_ingredients = []
        for item in recipe_item.get('recipe') or []:
            if not isinstance(item, dict) or not isinstance(item.get('name'), str):
                continue
            quantity = _number(item.get('weight'))
            food_ingredients.append({
                'name': item['name'],
                **({'quantity': _round(quantity)} if quantity is not None else {}),
                **({'unit': item['unit']} if isinstance(item.get('unit'), str) else {}),
            })
        dish_id = top.get('id') if isinstance(top.get('id'), int) else nutrition_item.get('id')
        foods.append({
            'name': name.strip(),
            **({'logMealDishId': dish_id} if isinstance(dish_id, int) else {}),
            **({'confidence': round(top['prob'], 3)} if isinstance(top.get('prob'), (int, float)) else {}),
            **({'portionGrams': _round(portion)} if portion else {}),
            'ingredients': food_ingredients,
        })

    overall_portion = _positive_number(ingredients.get('serving_size')) or _positive_number(nutrition.get('serving_size'))
    if not overall_portion and quantities:
        overall_portion = sum(item['grams'] for item in quantities)
    result = {
        'logMealImageId': image_id,
        'name': ', '.join(names),
        'foods': foods,
        **({'portionGrams': _round(overall_portion)} if overall_portion else {}),
        'caloriesKcal': _round(calories),
        'proteinG': _round(protein),
        'carbsG': _round(carbs),
        'fatG': _round(fat),
    }
    return result, quantities


def _nutrition_urls(image_id, token):
    query = parse.urlencode({'language': LOGMEAL_LANGUAGE})
    ingredients = _request_json(
        f'{LOGMEAL_BASE_URL}/nutrition/recipe/ingredients?{query}',
        token,
        json_body={'imageId': image_id},
    )
    nutrition = _request_json(
        f'{LOGMEAL_BASE_URL}/nutrition/recipe/nutritionalInfo?{query}',
        token,
        json_body={'imageId': image_id},
    )
    return ingredients, nutrition


def analyze_image(image, mime_type, extension, token):
    query = parse.urlencode({'language': LOGMEAL_LANGUAGE})
    segmentation = _request_json(
        f'{LOGMEAL_BASE_URL}/image/segmentation/complete/v1.0?{query}',
        token,
        multipart=(image, mime_type, extension),
    )
    image_id = segmentation.get('imageId')
    if not isinstance(image_id, int):
        raise MealAnalysisError(502, 'LogMeal cevap biçimi eksik.')
    ingredients, nutrition = _nutrition_urls(image_id, token)
    return parse_logmeal_analysis(segmentation, ingredients, nutrition)


def recalculate_image(image_id, quantities, portion_grams, token):
    current_total = sum(item['grams'] for item in quantities if _positive_number(item.get('grams')))
    if current_total <= 0:
        raise MealAnalysisError(422, 'Bu analiz için gramaj düzeltmesi desteklenmiyor.')
    if not 1 <= portion_grams <= 5000:
        raise MealAnalysisError(400, 'Porsiyon 1–5000 gram arasında olmalı.')
    ratio = portion_grams / current_total
    edits = {str(item['position']): round(item['grams'] * ratio, 2) for item in quantities}
    _request_json(
        f'{LOGMEAL_BASE_URL}/nutrition/confirm/quantity',
        token,
        json_body={'imageId': image_id, 'quantity': edits},
        allow_empty=True,
    )
    ingredients, nutrition = _nutrition_urls(image_id, token)
    segmentation = {
        'imageId': image_id,
        'segmentation_results': [
            {'food_item_position': item['position'], 'recognition_results': []}
            for item in quantities
        ],
    }
    return parse_logmeal_analysis(segmentation, ingredients, nutrition)


def customize_analysis_result(result, quantities, food_edits):
    """Apply user label/removal corrections without inventing nutrient fields.

    LogMeal returns nutrition for the full plate. Label changes therefore keep
    totals intact. When an item is removed, totals are scaled by the retained
    detected weight (or item count when LogMeal supplied no per-item weight).
    """
    foods = result.get('foods')
    if not isinstance(foods, list) or not foods:
        raise MealAnalysisError(400, 'Düzenlenebilir yiyecek bulunamadı.')
    if not isinstance(food_edits, list) or len(food_edits) != len(foods):
        raise MealAnalysisError(400, 'Yiyecek düzeltmeleri geçersiz.')

    retained = []
    retained_indexes = []
    for index, (food, edit) in enumerate(zip(foods, food_edits)):
        if not isinstance(food, dict) or not isinstance(edit, dict):
            raise MealAnalysisError(400, 'Yiyecek düzeltmeleri geçersiz.')
        if edit.get('removed') is True:
            continue
        name = str(edit.get('name') or '').strip()
        if not name or len(name) > 120:
            raise MealAnalysisError(400, 'Yiyecek adları 1–120 karakter arasında olmalı.')
        retained.append({**food, 'name': name})
        retained_indexes.append(index)
    if not retained:
        raise MealAnalysisError(400, 'Öğünde en az bir yiyecek kalmalı.')

    original_weight = sum(_positive_number(food.get('portionGrams')) or 0 for food in foods if isinstance(food, dict))
    retained_weight = sum(_positive_number(food.get('portionGrams')) or 0 for food in retained)
    ratio = retained_weight / original_weight if original_weight > 0 and retained_weight > 0 else len(retained) / len(foods)
    customized = {
        **result,
        'foods': retained,
        'name': ', '.join(food['name'] for food in retained),
    }
    removed_any = len(retained) != len(foods)
    if removed_any:
        for key in ('portionGrams', 'caloriesKcal', 'proteinG', 'carbsG', 'fatG'):
            if isinstance(result.get(key), (int, float)):
                customized[key] = _round(result[key] * ratio)
        customized['portionEditable'] = False

    retained_quantities = [
        quantity for index, quantity in enumerate(quantities)
        if index in retained_indexes and isinstance(quantity, dict)
    ] if not removed_any else []
    return customized, retained_quantities


def issue_analysis_token(secret, user_id, result, quantities, image_sha256):
    payload = {
        'kind': 'meal-analysis',
        'uid': user_id,
        'iat': int(time.time()),
        'result': result,
        'quantities': quantities,
        'imageSha256': image_sha256,
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode()).rstrip(b'=')
    signature = hmac.new(secret, encoded, hashlib.sha256).digest()
    return f"{encoded.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def read_analysis_token(secret, token, user_id):
    try:
        encoded, signature = token.split('.', 1)
        expected = hmac.new(secret, encoded.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(signature + '=' * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
        if payload.get('kind') != 'meal-analysis' or payload.get('uid') != user_id:
            raise ValueError
        issued_at = payload.get('iat')
        if not isinstance(issued_at, int) or time.time() - issued_at > ANALYSIS_TOKEN_TTL_SECONDS:
            raise MealAnalysisError(401, 'Analiz süresi doldu. Fotoğrafı yeniden analiz et.')
        if not isinstance(payload.get('result'), dict) or not isinstance(payload.get('quantities'), list) or not isinstance(payload.get('imageSha256'), str):
            raise ValueError
        return payload
    except MealAnalysisError:
        raise
    except Exception as exc:
        raise MealAnalysisError(400, 'Analiz doğrulanamadı. Fotoğrafı yeniden analiz et.') from exc
