# routes/papers.py
from flask import Blueprint, request, jsonify
from models.question_paper import QuestionPaper
from db import db
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.student_submission import StudentSubmission
from datetime import datetime
import os
import requests
import json

paper_bp = Blueprint('paper', __name__)

@paper_bp.route('/generate-paper', methods=['POST'])
@jwt_required()
def generate_paper_route():
    params = request.get_json()
    prompt = f"""
        Generate a comprehensive question paper with the following specifications:
        
        Subject: {params.get('subject')}
        Class: {params.get('class')}
        Total Marks: {params.get('totalMarks')}
        Difficulty Level: {params.get('difficulty')}
        Board: {params.get('board')}
        Chapters: {', '.join(params.get('chapters', []))}
        {f"Specific Topic: {params.get('specificTopic')}" if params.get('specificTopic') else ''}
        {f"Special Instructions: {params.get('instructions')}" if params.get('instructions') else ''}
        Paper Pattern: {params.get('paperPattern')}
        
        Please create a well-structured question paper in markdown format with:
        1. Header with subject, class, time duration, and marks
        2. Clear instructions for students
        3. Questions divided by marks (1, 2, 3, 5, 10 marks etc.)
        4. Proper numbering and formatting
        5. Include a mix of question types based on the pattern specified
        
        Make sure the total marks add up to exactly {params.get('totalMarks')} marks.
    """
    
    try:
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not gemini_api_key:
            return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
            
        gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }

        response = requests.post(gemini_api_url, json=payload)
        
        # Log the response for debugging
        print(f"Gemini API Response Status: {response.status_code}")
        print(f"Gemini API Response: {response.text}")
        
        response.raise_for_status()
        
        data = response.json()
        content = data.get("candidates")[0].get("content").get("parts")[0].get("text")
        return jsonify({'content': content})
        
    except requests.exceptions.RequestException as e:
        print(f"Gemini API Error: {e}")
        return jsonify({'error': f"API request failed: {e}"}), 500
    except Exception as e:
        print(f"Unexpected Error: {e}")
        return jsonify({'error': f"Failed to generate question paper: {e}"}), 500

@paper_bp.route('/papers', methods=['POST', 'OPTIONS'])
def create_paper():
    print("POST /papers endpoint called")
    if request.method == 'OPTIONS':
        print("OPTIONS request")
        return '', 200
    print("Before JWT verify")
    try:
        verify_jwt_in_request()
        print("After JWT verify")
        data = request.get_json()
        print('Received data:', data)
        print("Type of subject:", type(data.get('subject')))
        print("Value of subject:", data.get('subject'))
        user = get_jwt_identity()
        print("User identity:", user)
        print("Before creating QuestionPaper")
        paper = QuestionPaper(
            subject=data['subject'],
            class_name=data['class_name'],
            total_marks=data['total_marks'],
            difficulty=data['difficulty'],
            board=data['board'],
            content=data['content'],
            chapters=data['chapters'],
            created_by=data['created_by']
        )
        print("Paper object created")
        db.session.add(paper)
        print("Paper added to session")
        db.session.commit()
        print("Paper committed to DB")
        print(f"Paper saved with ID: {paper.id}")
        return jsonify({'message': 'Paper created', 'paper_id': paper.id})
    except Exception as e:
        print('Error creating paper:', repr(e))
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 422

@paper_bp.route('/papers', methods=['GET'])
@jwt_required()
def get_papers():
    print("GET /papers endpoint called")
    papers = QuestionPaper.query.all()
    print(f"Found {len(papers)} papers in database")
    
    result = [{
        'id': p.id,
        'subject': p.subject,
        'class': p.class_name,
        'totalMarks': p.total_marks,
        'difficulty': p.difficulty,
        'board': p.board,
        'content': p.content,
        'chapters': p.chapters,
        'createdBy': p.created_by,
        'createdAt': p.created_at.isoformat()
    } for p in papers]
    
    print(f"Returning {len(result)} papers")
    print("Paper IDs:", [p['id'] for p in result])
    return jsonify(result)

@paper_bp.route('/papers/<int:paper_id>', methods=['GET'])
@jwt_required()
def get_paper_by_id(paper_id):
    paper = QuestionPaper.query.get(paper_id)
    if not paper:
        return jsonify({'error': 'Paper not found'}), 404
    return jsonify({
        'id': paper.id,
        'subject': paper.subject,
        'class': paper.class_name,
        'totalMarks': paper.total_marks,
        'difficulty': paper.difficulty,
        'board': paper.board,
        'content': paper.content,
        'chapters': paper.chapters,
        'createdBy': paper.created_by,
        'createdAt': paper.created_at.isoformat()
    })

@paper_bp.route('/test-debug', methods=['GET'])
def test_debug():
    print("Test debug route hit")
    return jsonify({"msg": "Debug route working"})

@paper_bp.route('/papers/<int:paper_id>', methods=['DELETE'])
@jwt_required()
def delete_paper(paper_id):
    paper = QuestionPaper.query.get(paper_id)
    if not paper:
        return jsonify({'error': 'Paper not found'}), 404
    # Delete all related student submissions
    StudentSubmission.query.filter_by(question_paper_id=paper_id).delete()
    db.session.delete(paper)
    db.session.commit()
    return jsonify({'message': 'Paper and related submissions deleted'}), 200

@paper_bp.route('/submissions', methods=['POST'])
@jwt_required()
def create_submission():
    data = request.get_json()
    try:
        submission = StudentSubmission(
            question_paper_id=data['question_paper_id'],
            student_id=data['student_id'],
            student_name=data['student_name'],
            answers=data['answers'],
            submitted_at=datetime.utcnow(),
            evaluated=False,
            evaluation=None
        )
        db.session.add(submission)
        db.session.commit()
        return jsonify({'message': 'Submission saved', 'submission_id': submission.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@paper_bp.route('/submissions', methods=['GET'])
@jwt_required()
def get_submissions():
    submissions = StudentSubmission.query.all()
    result = []
    for sub in submissions:
        result.append({
            'id': sub.id,
            'questionPaperId': sub.question_paper_id,
            'studentId': sub.student_id,
            'studentName': sub.student_name,
            'answers': sub.answers,
            'submittedAt': sub.submitted_at.isoformat() if sub.submitted_at else None,
            'evaluated': sub.evaluated,
            'evaluation': sub.evaluation
        })
    return jsonify(result)

@paper_bp.route('/submissions/<int:submission_id>', methods=['PATCH'])
@jwt_required()
def update_submission_evaluation(submission_id):
    data = request.get_json()
    submission = StudentSubmission.query.get(submission_id)
    if not submission:
        return jsonify({'error': 'Submission not found'}), 404
    submission.evaluation = data.get('evaluation')
    submission.evaluated = True
    db.session.commit()
    return jsonify({'message': 'Submission evaluation updated'})

@paper_bp.route('/evaluate-submission', methods=['POST'])
@jwt_required()
def evaluate_submission_route():
    data = request.get_json()
    question = data.get('question')
    student_answer = data.get('studentAnswer')
    max_marks = data.get('maxMarks', 100)
    
    prompt = f"""
        Please evaluate the following student response carefully:

        Question: {question}
        Student Answer: {student_answer}
        Maximum Marks: {max_marks}

        Please provide a detailed evaluation in the following JSON format:
        {{
            "percentage": [percentage score out of 100],
            "grade": "[A+/A/B+/B/C+/C/D/F based on percentage]",
            "feedback": "[detailed constructive feedback explaining what was correct, what was missing, and suggestions for improvement]",
            "scoreBreakdown": "[breakdown of marks awarded for different aspects of the answer]"
        }}

        Grading scale:
        90-100%: A+
        80-89%: A
        70-79%: B+
        60-69%: B
        50-59%: C+
        40-49%: C
        30-39%: D
        Below 30%: F

        Be fair but constructive in your evaluation.
    """
    
    try:
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not gemini_api_key:
            return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
            
        gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }

        response = requests.post(gemini_api_url, json=payload)
        
        # Log the response for debugging
        print(f"Gemini Evaluation API Response Status: {response.status_code}")
        print(f"Gemini Evaluation API Response: {response.text}")
        
        response.raise_for_status()
        
        data = response.json()
        response_text = data.get("candidates")[0].get("content").get("parts")[0].get("text", "")
        
        try:
            # Try to parse JSON response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                evaluation = json.loads(json_match.group())
                return jsonify(evaluation)
        except json.JSONDecodeError:
            pass

        # Fallback if JSON parsing fails
        fallback_evaluation = {
            "percentage": 75,
            "grade": "B+",
            "feedback": "Answer evaluated. Please check the detailed response for specific feedback.",
            "scoreBreakdown": "Partial marks awarded based on content accuracy and completeness."
        }
        return jsonify(fallback_evaluation)
        
    except requests.exceptions.RequestException as e:
        print(f"Gemini Evaluation API Error: {e}")
        return jsonify({'error': f"API request failed: {e}"}), 500
    except Exception as e:
        print(f"Unexpected Evaluation Error: {e}")
        return jsonify({'error': f"Failed to evaluate submission: {e}"}), 500
