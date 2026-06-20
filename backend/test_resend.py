"""
Resend API direct test — check if email actually sends
"""

import asyncio
import httpx
import base64


async def test_resend():
    # Test settings se read karo
    api_key = "re_AUSsCnmP_2565dWcYRU21iFxeHo9PxK43"
    from_email = "onboarding@resend.dev"  # Resend ka default test domain
    to_email = "muhammadsohaib2233344@gmail.com"  # Resend trial mein sirf is email ko test kar sakte ho
    
    # Dummy PDF
    pdf_bytes = b"PDF test content"
    attachment_b64 = base64.b64encode(pdf_bytes).decode()

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": "Test Invoice",
        "text": "This is a test email from Resend",
        "attachments": [
            {
                "filename": "test.pdf",
                "content": attachment_b64,
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    print(f"Testing Resend API...")
    print(f"From: {from_email}")
    print(f"To: {to_email}")
    print(f"API Key: {api_key[:20]}...")
    print()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
        
        print(f"Status Code: {resp.status_code}")
        print(f"Response Headers: {dict(resp.headers)}")
        print(f"Response Body: {resp.text}")
        print()
        
        if resp.status_code >= 200 and resp.status_code < 300:
            print("✅ Email accepted by Resend")
        else:
            print(f"❌ Resend rejected email with status {resp.status_code}")
            
    except Exception as exc:
        print(f"❌ Exception: {exc}")


if __name__ == "__main__":
    asyncio.run(test_resend())
