from flask import Blueprint, request, jsonify
from db import db

from models.user import User

from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask import current_app

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    role = data.get('role')
    password = data.get('password')

    if not email or not password or not name or not role:
        return jsonify({'error': 'All fields (email, password, name, role) are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'User already exists'}), 400

    user = User(email=email, name=name, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id), additional_claims={
        "email": user.email,
        "name": user.name,
        "role": user.role
    })
    return jsonify({'token': access_token, 'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}})

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
        "role": user.role
    })
    return jsonify({'token': access_token, 'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}})
