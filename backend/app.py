from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/upload', methods=['POST'])
def upload_pdf():
    # Placeholder for PDF upload logic
    return jsonify({'message': 'PDF upload endpoint'}), 200

if __name__ == '__main__':
    app.run(debug=True)
