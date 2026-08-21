import base64
import hashlib
import os
import sys
import time
import unittest


SERVER_DIR = os.path.dirname(os.path.dirname(__file__))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from logmeal import (  # noqa: E402
    MealAnalysisError,
    decode_image_payload,
    issue_analysis_token,
    parse_logmeal_analysis,
    read_analysis_token,
)


class LogMealContractTests(unittest.TestCase):
    def setUp(self):
        self.segmentation = {
            'imageId': 1981523,
            'segmentation_results': [
                {
                    'food_item_position': 1,
                    'recognition_results': [{'id': 16, 'name': 'brokoli', 'prob': 0.94}],
                },
                {
                    'food_item_position': 2,
                    'recognition_results': [{'id': 1480, 'name': 'şnitzel', 'prob': 0.91}],
                },
            ],
        }
        self.ingredients = {
            'imageId': 1981523,
            'serving_size': 328.2,
            'recipe_per_item': [
                {
                    'food_item_position': 1,
                    'name': 'brokoli',
                    'serving_size': 148.0,
                    'unit': 'g',
                    'recipe': [{'id': 79, 'name': 'brokoli', 'unit': 'g', 'weight': 140.0}],
                },
                {
                    'food_item_position': 2,
                    'name': 'şnitzel',
                    'serving_size': 180.2,
                    'unit': 'g',
                    'recipe': [{'id': 120, 'name': 'tavuk', 'unit': 'g', 'weight': 160.0}],
                },
            ],
        }
        self.nutrition = {
            'foodName': ['brokoli', 'şnitzel'],
            'hasNutritionalInfo': True,
            'ids': [16, 1480],
            'imageId': 1981523,
            'nutritional_info': {
                'calories': 474.5,
                'totalNutrients': {
                    'PROCNT': {'label': 'Protein', 'quantity': 42.6, 'unit': 'g'},
                    'CHOCDF': {'label': 'Carbs', 'quantity': 34.2, 'unit': 'g'},
                    'FAT': {'label': 'Fat', 'quantity': 18.1, 'unit': 'g'},
                },
            },
        }

    def test_parses_only_documented_logmeal_fields(self):
        result, quantities = parse_logmeal_analysis(self.segmentation, self.ingredients, self.nutrition)
        self.assertEqual(result['logMealImageId'], 1981523)
        self.assertEqual(result['name'], 'brokoli, şnitzel')
        self.assertEqual(result['portionGrams'], 328.2)
        self.assertEqual(result['caloriesKcal'], 474.5)
        self.assertEqual(result['proteinG'], 42.6)
        self.assertEqual(result['carbsG'], 34.2)
        self.assertEqual(result['fatG'], 18.1)
        self.assertEqual(quantities, [{'position': 1, 'grams': 148.0}, {'position': 2, 'grams': 180.2}])

    def test_missing_nutrition_is_not_replaced_with_fake_values(self):
        self.nutrition['hasNutritionalInfo'] = False
        with self.assertRaises(MealAnalysisError) as caught:
            parse_logmeal_analysis(self.segmentation, self.ingredients, self.nutrition)
        self.assertEqual(caught.exception.status, 422)

    def test_analysis_token_is_bound_to_student(self):
        result, quantities = parse_logmeal_analysis(self.segmentation, self.ingredients, self.nutrition)
        secret = b'test-secret'
        token = issue_analysis_token(secret, 'student-one', result, quantities, hashlib.sha256(b'image').hexdigest())
        payload = read_analysis_token(secret, token, 'student-one')
        self.assertEqual(payload['result']['logMealImageId'], 1981523)
        with self.assertRaises(MealAnalysisError):
            read_analysis_token(secret, token, 'student-two')

    def test_expired_analysis_token_is_rejected(self):
        result, quantities = parse_logmeal_analysis(self.segmentation, self.ingredients, self.nutrition)
        secret = b'test-secret'
        token = issue_analysis_token(secret, 'student-one', result, quantities, 'digest')
        encoded, signature = token.split('.', 1)
        payload = __import__('json').loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
        payload['iat'] = int(time.time()) - 4000
        encoded = base64.urlsafe_b64encode(__import__('json').dumps(payload, separators=(',', ':')).encode()).rstrip(b'=').decode()
        signature = base64.urlsafe_b64encode(__import__('hmac').new(secret, encoded.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
        with self.assertRaises(MealAnalysisError) as caught:
            read_analysis_token(secret, f'{encoded}.{signature}', 'student-one')
        self.assertEqual(caught.exception.status, 401)

    def test_image_validation_accepts_jpeg_and_rejects_unknown_type(self):
        jpeg = b'\xff\xd8\xff' + (b'0' * 200)
        image, mime_type, extension = decode_image_payload({'imageBase64': base64.b64encode(jpeg).decode()})
        self.assertEqual(image, jpeg)
        self.assertEqual((mime_type, extension), ('image/jpeg', 'jpg'))
        with self.assertRaises(MealAnalysisError):
            decode_image_payload({'imageBase64': base64.b64encode(b'x' * 200).decode()})


if __name__ == '__main__':
    unittest.main()
