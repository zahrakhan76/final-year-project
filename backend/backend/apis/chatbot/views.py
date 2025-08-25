# chatbot/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
import json
import requests
from django.conf import settings

@api_view(['POST'])
def chatbot_response(request):
    if 'message' not in request.data:
        return Response({'error': 'No message provided'}, status=400)

    try:
        user_message = request.data['message']

        print(f"Received user message: {user_message}")

        # Load FAQs from faqs.json
        with open('d:/New folder/backend/apis/chatbot/faqs.json', 'r') as f:
            faqs = json.load(f)['faqs']

        print("Checking FAQs...")

        # Check if the message matches any FAQ
        for faq in faqs:
            print(f"Checking FAQ: {faq['question']}")
            if user_message.lower() == faq['question'].lower():
                print("Match found in FAQs.")
                return Response({'reply': faq['answer']}, status=200)

        print("No match found in FAQs. Querying OpenRouter API...")

        # If no match, query OpenRouter API
        openrouter_url = "https://openrouter.ai/api/v1/chat/completions"  # Updated endpoint
        headers = {
            'Authorization': '',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://flumers.com',  # Added referer header
            'X-Title': 'Flumers Assistant'  # Added title header
        }
        payload = {
            'model': 'mistralai/mistral-7b-instruct',  # Updated model name
            'messages': [
                {'role': 'system', 'content': 'You are a helpful assistant for Flumers platform.'},  # Added system message
                {'role': 'user', 'content': user_message}
            ]
        }

        # Debugging OpenRouter API call
        print(f"Payload: {payload}")
        response = requests.post(openrouter_url, headers=headers, json=payload)
        print(f"OpenRouter API response status: {response.status_code}")
        print(f"OpenRouter API response data: {response.text}")

        # Check if the response is JSON
        if response.headers.get('Content-Type') == 'application/json':
            response_data = response.json()

            if response.status_code == 200 and 'choices' in response_data:
                bot_reply = response_data['choices'][0]['message']['content']
                print("OpenRouter API returned a valid response.")
                return Response({'reply': bot_reply}, status=200)
            else:
                print("Failed to get a valid response from OpenRouter API.")
                return Response({'error': 'Failed to get a response from OpenRouter', 'details': response_data}, status=500)
        else:
            print("OpenRouter API did not return JSON.")
            # Log the response details for debugging purposes
            print(f"Response headers: {response.headers}")
            print(f"Response text: {response.text}")

            # Provide a more detailed error message
            return Response({
                'error': 'OpenRouter API did not return JSON',
                'details': response.text,
                'suggestion': 'The API might be down or the request might be incorrect. Please check the API status or your request payload.'
            }, status=500)

    except Exception as e:
        print(f"Error during chatbot response: {str(e)}")
        return Response({'error': 'Failed to process message', 'details': str(e)}, status=500)
