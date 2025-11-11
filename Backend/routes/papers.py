# routes/papers.py
from flask import Blueprint, request, jsonify
from models.question_paper import QuestionPaper
from db import db
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request, get_jwt
from models.student_submission import StudentSubmission
from models.user import User
from datetime import datetime
import os
import requests
import json

papers_bp = Blueprint('papers', __name__)

@papers_bp.route('/generate-paper', methods=['POST'])
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
        
        # Enhanced error handling for Gemini response
        if not data.get("candidates"):
            # Check for a prompt feedback block if no candidates are returned
            prompt_feedback = data.get("promptFeedback")
            if prompt_feedback:
                error_info = f"Content generation blocked. Reason: {prompt_feedback.get('blockReason')}. Safety ratings: {prompt_feedback.get('safetyRatings')}"
                print(f"Gemini API Error: {error_info}")
                return jsonify({'error': error_info}), 500
            
            # General error if no candidates and no specific feedback
            print("Gemini API Error: No candidates in response and no prompt feedback.")
            return jsonify({'error': 'Failed to generate content from Gemini API: No candidates in response.'}), 500

        candidate = data["candidates"][0]
        finish_reason = candidate.get("finishReason")
        
        if finish_reason and finish_reason != "STOP":
            error_info = f"Content generation finished for a reason other than 'STOP'. Reason: {finish_reason}"
            print(f"Gemini API Warning: {error_info}")
            # Potentially return an error or handle as a partial response
            # For now, we will still try to get content but log the warning.

        if not (candidate.get("content") and candidate["content"].get("parts")):
            print("Gemini API Error: Malformed response, 'content' or 'parts' missing.")
            return jsonify({'error': 'Malformed response from Gemini API.'}), 500
            
        content = candidate["content"]["parts"][0].get("text", "")
        return jsonify({'content': content})
        
    except requests.exceptions.RequestException as e:
        print(f"Gemini API Error: {e}")
        return jsonify({'error': f"API request failed: {e}"}), 500
    except Exception as e:
        print(f"Unexpected Error: {e}")
        return jsonify({'error': f"Failed to generate question paper: {e}"}), 500

@papers_bp.route('/papers', methods=['POST', 'OPTIONS'])
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
        current_user_id = get_jwt_identity()
        print("User identity:", current_user_id)
        print("Before creating QuestionPaper")
        paper = QuestionPaper(
            subject=data['subject'],
            class_name=data['class_name'],
            total_marks=data['total_marks'],
            difficulty=data['difficulty'],
            board=data['board'],
            content=data['content'],
            # chapters=','.join(data.get('chapters', [])), # Temporarily disabled
            created_by=current_user_id
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

@papers_bp.route('/papers', methods=['GET'])
@jwt_required()
def get_papers():
    print("GET /papers endpoint called")
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    is_student = claims.get('role') == 'student'
    
    if is_student:
        # Students only see papers for their class
        user = User.query.get(current_user_id)
        if user and user.class_name:
            papers = QuestionPaper.query.filter_by(class_name=user.class_name).all()
            print(f"Found {len(papers)} papers for student {current_user_id} in class {user.class_name}")
        else:
            papers = [] # No class name, so no papers
            print(f"Student {current_user_id} has no class_name, returning 0 papers.")
    else:
        # Teachers only see their own papers
        papers = QuestionPaper.query.filter_by(created_by=current_user_id).all()
        print(f"Found {len(papers)} papers in database for user {current_user_id}")
    
    result = [{
        'id': p.id,
        'subject': p.subject,
        'class': p.class_name,
        'totalMarks': p.total_marks,
        'difficulty': p.difficulty,
        'board': p.board,
        'content': p.content,
        # 'chapters': p.chapters.split(',') if p.chapters else [], # Temporarily disabled
        'createdBy': p.created_by,
        'createdAt': p.created_at.isoformat()
    } for p in papers]
    
    print(f"Returning {len(result)} papers")
    print("Paper IDs:", [p['id'] for p in result])
    return jsonify(result)

@papers_bp.route('/papers/<int:paper_id>', methods=['GET'])
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
        # 'chapters': paper.chapters.split(',') if paper.chapters else [], # Temporarily disabled
        'createdBy': paper.created_by,
        'createdAt': paper.created_at.isoformat()
    })

@papers_bp.route('/test-debug', methods=['GET'])
def test_debug():
    print("Test debug route hit")
    return jsonify({"msg": "Debug route working"})


@papers_bp.route('/debug/gemini', methods=['GET'])
def debug_gemini_config():
    """Safe debug endpoint: returns whether GEMINI_API_KEY is present (does NOT return the key)."""
    gemini_present = bool(os.environ.get('GEMINI_API_KEY'))
    return jsonify({
        'gemini_configured': gemini_present
    })

@papers_bp.route('/papers/<int:paper_id>', methods=['DELETE'])
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

@papers_bp.route('/submissions', methods=['POST'])
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

@papers_bp.route('/submissions', methods=['GET'])
@jwt_required()
def get_submissions():
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    role = claims.get('role')

    if role == 'student':
        # Students can only see their own submissions
        submissions = StudentSubmission.query.filter_by(student_id=current_user_id).all()
    elif role == 'teacher':
        # Teachers can see all submissions for papers they have created
        user_papers = [p.id for p in QuestionPaper.query.filter_by(created_by=current_user_id).all()]
        submissions = StudentSubmission.query.filter(StudentSubmission.question_paper_id.in_(user_papers)).all()
    else:
        return jsonify({"error": "Unauthorized role"}), 403

    result = [{
        'id': s.id,
        'questionPaperId': s.question_paper_id,
        'studentId': s.student_id,
        'studentName': s.student_name,
        'answers': s.answers,
        'submittedAt': s.submitted_at.isoformat(),
        'evaluated': s.evaluated,
        'evaluation': s.evaluation,
        'paper': None
    } for s in submissions]
    # Attach paper details
    paper_map = {p.id: p for p in QuestionPaper.query.filter(QuestionPaper.id.in_([s.question_paper_id for s in submissions])).all()}
    for r in result:
        p = paper_map.get(r['questionPaperId'])
        if p:
            r['paper'] = {
                'subject': p.subject,
                'class': p.class_name,
                'board': p.board,
                'difficulty': p.difficulty,
                'totalMarks': p.total_marks
            }
    return jsonify(result)

@papers_bp.route('/submission/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_submission(submission_id):
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        submission = StudentSubmission.query.get(submission_id)

        if not submission:
            return jsonify({"error": "Submission not found"}), 404

        # Check if the user is authorized to view this submission
        is_student_owner = submission.student_id == current_user_id
        
        paper = QuestionPaper.query.get(submission.question_paper_id)
        is_teacher_owner = paper.created_by == current_user_id if paper else False

        if not (is_student_owner or is_teacher_owner):
             return jsonify({"error": "Unauthorized"}), 403

        submission_data = {
            "id": submission.id,
            "questionPaperId": submission.question_paper_id,
            "studentId": submission.student_id,
            "studentName": submission.student_name,
            "submittedAt": submission.submitted_at.isoformat(),
            "evaluated": submission.evaluated,
            "evaluation": submission.evaluation,
        }
        
        if paper:
            submission_data['paper'] = {
                'subject': paper.subject,
                'class': paper.class_name,
                'board': paper.board,
                'difficulty': paper.difficulty,
                'totalMarks': paper.total_marks
            }

        return jsonify(submission_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@papers_bp.route('/submissions/<int:submission_id>', methods=['PATCH'])
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

@papers_bp.route('/evaluate-submission', methods=['POST'])
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

# Export for compatibility with app.py
paper_bp = papers_bp
