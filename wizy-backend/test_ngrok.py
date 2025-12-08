import requests

url = "https://concludible-archidiaconal-monnie.ngrok-free.dev/upload"

files = {
    'video': ('test.mp4', open('test.mp4', 'rb'), 'video/mp4')
}

data = {
    'userId': 'test-user-ngrok',
    'description': 'Ngrok public endpoint test'
}

print("📤 Uploading test video to ngrok...")
try:
    response = requests.post(url, files=files, data=data, timeout=120)
    print(f"\n✅ Status Code: {response.status_code}")
    print(f"📄 Response:\n{response.json()}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n🎬 Video URL: {result['data']['video_url']}")
        print(f"🖼️ Thumbnail URL: {result['data']['thumbnail_url']}")
        print("\n✅ NGROK TEST PASSED!")
    else:
        print("\n❌ NGROK TEST FAILED!")
except Exception as e:
    print(f"\n❌ Error: {e}")
