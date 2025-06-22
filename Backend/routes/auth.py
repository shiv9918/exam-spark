import os
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify
from db import db

from models.user import User

from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask import current_app

auth_bp = Blueprint('auth', __name__)

# Configuration for file uploads
UPLOAD_FOLDER = 'uploads/profile_pics'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@auth_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({'message': 'pong'}), 200

@auth_bp.route('/signup', methods=['POST'])
def signup():
    if 'profile_pic' not in request.files:
        return jsonify({'error': 'No profile picture provided'}), 400

    file = request.files['profile_pic']
    email = request.form.get('email')
    name = request.form.get('name')
    role = request.form.get('role')
    password = request.form.get('password')
    roll_no = request.form.get('roll_no')
    class_name = request.form.get('class_name')

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Basic validation for all roles
    if not all([email, name, role, password]):
        return jsonify({'error': 'Email, name, role, and password are required'}), 400

    # Role-specific validation
    if role == 'student' and not all([roll_no, class_name]):
        return jsonify({'error': 'Roll number and class name are required for students'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'User already exists'}), 400
        
    profile_pic_url = None
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # To avoid filename conflicts, prepend user ID or a timestamp. For now, we'll use a simple approach.
        # A more robust solution would involve generating a unique ID for the filename.
        upload_path = os.path.join(current_app.root_path, UPLOAD_FOLDER)
        os.makedirs(upload_path, exist_ok=True)
        file.save(os.path.join(upload_path, filename))
        profile_pic_url = f"{UPLOAD_FOLDER}/{filename}".replace('\\', '/')

    user = User(email=email, name=name, role=role, profile_pic_url=profile_pic_url, roll_no=roll_no, class_name=class_name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id), additional_claims={
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "profile_pic_url": user.profile_pic_url,
        "roll_no": user.roll_no,
        "class_name": user.class_name
    })
    return jsonify({
        'token': access_token, 
        'user': {
            'id': user.id, 
            'email': user.email, 
            'name': user.name, 
            'role': user.role,
            'profile_pic_url': user.profile_pic_url,
            'roll_no': user.roll_no,
            'class_name': user.class_name
        }
    })

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id), additional_claims={
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "profile_pic_url": user.profile_pic_url,
        "roll_no": user.roll_no,
        "class_name": user.class_name
    })
    return jsonify({
        'token': access_token, 
        'user': {
            'id': user.id, 
            'email': user.email, 
            'name': user.name, 
            'role': user.role,
            'profile_pic_url': user.profile_pic_url,
            'roll_no': user.roll_no,
            'class_name': user.class_name
        }
    })
