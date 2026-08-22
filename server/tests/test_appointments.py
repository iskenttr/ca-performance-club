import unittest
import os
import sys
from datetime import datetime


SERVER_DIR = os.path.dirname(os.path.dirname(__file__))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from ca_server import ISTANBUL, appointment_is_in_working_hours, appointment_overlaps


class AppointmentAvailabilityTests(unittest.TestCase):
    def test_detects_overlapping_pending_appointment(self):
        state = {
            'appointments': [{
                'startAt': '2026-08-24T18:00:00+03:00',
                'durationMinutes': 60,
                'status': 'pending',
            }],
        }
        self.assertTrue(appointment_overlaps(state, datetime(2026, 8, 24, 18, 30, tzinfo=ISTANBUL), 45))
        self.assertFalse(appointment_overlaps(state, datetime(2026, 8, 24, 19, 0, tzinfo=ISTANBUL), 60))

    def test_ignores_cancelled_appointment(self):
        state = {
            'appointments': [{
                'startAt': '2026-08-24T18:00:00+03:00',
                'durationMinutes': 60,
                'status': 'cancelled',
            }],
        }
        self.assertFalse(appointment_overlaps(state, datetime(2026, 8, 24, 18, 0, tzinfo=ISTANBUL), 60))

    def test_blocks_trainer_unavailable_time(self):
        state = {
            'appointments': [],
            'appointmentBlocks': [{
                'startAt': '2026-08-24T12:00:00+03:00',
                'endAt': '2026-08-24T14:00:00+03:00',
            }],
        }
        self.assertTrue(appointment_overlaps(state, datetime(2026, 8, 24, 13, 30, tzinfo=ISTANBUL), 60))
        self.assertFalse(appointment_overlaps(state, datetime(2026, 8, 24, 14, 0, tzinfo=ISTANBUL), 60))

    def test_enforces_cem_hoca_working_hours(self):
        monday = datetime(2026, 8, 24, 9, 0, tzinfo=ISTANBUL)
        sunday = datetime(2026, 8, 23, 12, 0, tzinfo=ISTANBUL)
        self.assertTrue(appointment_is_in_working_hours(monday, 60))
        self.assertFalse(appointment_is_in_working_hours(monday.replace(hour=20, minute=30), 60))
        self.assertFalse(appointment_is_in_working_hours(sunday, 60))


if __name__ == '__main__':
    unittest.main()
