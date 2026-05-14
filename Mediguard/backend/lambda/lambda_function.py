
import boto3
import json
import os
import base64

BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'ap-southeast-5')
MODEL_ID       = os.environ.get('BEDROCK_MODEL_ID', 'global.anthropic.claude-haiku-4-5-20251001-v1:0')
MAX_TOKENS     = int(os.environ.get('MAX_TOKENS', '2000'))

bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)

CORS_HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
}


def lambda_handler(event, context):
    print(f'[DEBUG] Event: {json.dumps(event)}')
    print(f'[DEBUG] Region: {BEDROCK_REGION}, Model: {MODEL_ID}')

    method = (event.get('httpMethod') or
              event.get('requestContext', {}).get('http', {}).get('method', ''))
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    try:
        raw_body = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            raw_body = base64.b64decode(raw_body).decode('utf-8')
        body = raw_body if isinstance(raw_body, dict) else json.loads(raw_body)
        
        # Support both old prompt format and new messages format
        if 'messages' in body:
            messages = body['messages']
            if not messages:
                raise ValueError('Messages array is empty.')
        elif 'prompt' in body:
            prompt = body.get('prompt', '').strip()
            if not prompt:
                raise ValueError('Missing prompt in request body.')
            messages = [{'role': 'user', 'content': prompt}]
        else:
            raise ValueError('Missing prompt or messages in request body.')
            
    except (json.JSONDecodeError, ValueError) as e:
        print(f'[ERROR] Body parse failed: {e}')
        return _error(400, str(e))

    try:
        print(f'[DEBUG] Calling Bedrock with model: {MODEL_ID}')
        
        # Build payload
        payload = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': MAX_TOKENS,
            'messages': messages
        }
        
        # Add system prompt if provided
        if 'systemPrompt' in body:
            payload['system'] = body['systemPrompt']
        
        response = bedrock.invoke_model(
            modelId     = MODEL_ID,
            contentType = 'application/json',
            accept      = 'application/json',
            body        = json.dumps(payload),
        )
        result = json.loads(response['body'].read())
        text   = result['content'][0]['text']
        print(f'[DEBUG] Success, response length: {len(text)}')
        return {
            'statusCode': 200,
            'headers':    CORS_HEADERS,
            'body':       json.dumps({'text': text}),
        }

    except Exception as e:
        print(f'[ERROR] Bedrock call failed: {type(e).__name__}: {e}')
        return _error(500, f'{type(e).__name__}: {str(e)}')


def _error(status, message):
    print(f'[ERROR] Returning {status}: {message}')
    return {
        'statusCode': status,
        'headers':    CORS_HEADERS,
        'body':       json.dumps({'error': message}),
    }
