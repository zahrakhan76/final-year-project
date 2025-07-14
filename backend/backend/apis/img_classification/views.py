# img_classification/views.py
import io
import os
import numpy as np
from PIL import Image
from rest_framework.decorators import api_view
from rest_framework.response import Response
import onnxruntime as ort
from torchvision import transforms

# Updated model path
onnx_path = os.path.join(os.path.dirname(__file__), 'efficientnet_b1.onnx')
if not os.path.exists(onnx_path):
    raise FileNotFoundError(f"Model not found at {onnx_path}")

# Initialize the ONNX Runtime session
session = ort.InferenceSession(onnx_path)

# Updated labels for classification
LABELS = [
    'baby_products', 'beauty_health', 'clothing_accessories_jewellery',
    'electronics', 'grocery', 'hobby_arts_stationery',
    'home_kitchen_tools', 'pet_supplies', 'sports_outdoor'
]

def preprocess(image):
    image = image.convert('RGB')
    image = image.resize((240, 240))
    img_np = np.array(image).astype(np.float32) / 255.0
    img_np = (img_np - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    img_np = np.transpose(img_np, (2, 0, 1))
    img_np = np.expand_dims(img_np, axis=0).astype(np.float32)  # Ensure the tensor is float32
    return img_np

@api_view(['POST'])
def classify_image(request):
    if 'image' not in request.FILES:
        return Response({'error': 'No image provided'}, status=400)

    try:
        file = request.FILES['image']

        # Load and preprocess image
        image = Image.open(io.BytesIO(file.read()))
        input_tensor = preprocess(image)

        # Perform model inference
        outputs = session.run(None, {session.get_inputs()[0].name: input_tensor})

        # Extract prediction
        prediction = int(np.argmax(outputs[0]))

        # Return response
        return Response({
            'category': LABELS[prediction],
            'confidence': float(np.max(outputs[0]))
        }, status=200)

    except Exception as e:
        print(f"Error during classification: {str(e)}")
        return Response({'error': 'Failed to process image', 'details': str(e)}, status=500)
