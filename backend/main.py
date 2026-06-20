"""
FastAPI Backend for ASL Recognition
Uses the existing trained models from asl_project
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import os
from pathlib import Path
from datetime import datetime, timedelta
import json
from collections import deque

try:
    import tensorflow as tf
    TENSORFLOW_AVAILABLE = True
    print("✅ TensorFlow is available")
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("⚠️ TensorFlow is NOT available. Running in mock prediction mode.")

# Azure Communication Services - optional import
try:
    from azure.communication.identity import CommunicationIdentityClient
    try:
        from azure.communication.rooms import RoomsClient
        ROOMS_AVAILABLE = True
    except ImportError:
        ROOMS_AVAILABLE = False
        print("⚠️ Azure Rooms SDK not installed. Install with: pip install azure-communication-rooms")
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False
    ROOMS_AVAILABLE = False
    print("⚠️ Azure Communication Services SDK not installed. Install with: pip install azure-communication-identity")

# Get paths - resolve relative to project root
# main.py is at: /backend/main.py
# asl_project is at: /asl_project/
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent  # Go up from /backend/ to project root
ASL_PROJECT_DIR = PROJECT_ROOT / "asl_project"

ASL_TRAINING_DIR = PROJECT_ROOT / "asl_training"
TRANSFORMER_MODEL_PATH = ASL_PROJECT_DIR / "asl_word_transformer.keras"
TRANSFORMER_LABELS_PATH = ASL_TRAINING_DIR / "label_map.json"

# ---------------- APP ----------------
app = FastAPI(title="ASL Recognition API")

# ---------------- CORS (IMPORTANT) ----------------
allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- LOAD MODELS ----------------
alphabet_model = None
word_model = None

ALPHABET_MODEL_PATH = ASL_PROJECT_DIR / "asl_alphabet_model.h5"
WORD_MODEL_PATH = ASL_PROJECT_DIR / "asl_dynamic_word_lstm.h5"
LABELS_PATH = ASL_PROJECT_DIR / "labels.txt"

# Load word labels
WORD_LABELS = []
if LABELS_PATH.exists():
    with open(LABELS_PATH, "r") as f:
        WORD_LABELS = [line.strip() for line in f.readlines()]
else:
    print(f"⚠️ Warning: {LABELS_PATH} not found. Word labels unavailable.")

ALPHABET_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


# Transformer model (loaded on startup)
transformer_model = None
TRANSFORMER_LABELS: dict = {}  # int -> gloss string


# Pydantic models for request/response
class PredictRequest(BaseModel):
    mode: str
    landmarks: list

class PredictResponse(BaseModel):
    prediction: int
    label: str


def load_models():
    """Load TensorFlow models if TensorFlow is available"""
    global alphabet_model, word_model
    
    if not TENSORFLOW_AVAILABLE:
        print("⚠️ TensorFlow not available. Skipping model loading, mock predictions will be used.")
        return
        
    # Custom LSTM class to handle time_major parameter compatibility
    # This filters out the time_major parameter that's not supported in newer TensorFlow versions
    class CompatibleLSTM(tf.keras.layers.LSTM):
        def __init__(self, *args, **kwargs):
            # Remove time_major if present (not supported in newer versions)
            kwargs.pop('time_major', None)
            super().__init__(*args, **kwargs)
        
        @classmethod
        def from_config(cls, config):
            # Filter out time_major from config when loading from saved model
            if isinstance(config, dict):
                config = config.copy()
                config.pop('time_major', None)
            # Call parent's from_config with filtered config
            return tf.keras.layers.LSTM.from_config(config)
    
    custom_objects = {'LSTM': CompatibleLSTM, 'LSTMCell': CompatibleLSTM}
    
    try:
        print(f"📦 Loading alphabet model from: {ALPHABET_MODEL_PATH}")
        if ALPHABET_MODEL_PATH.exists():
            # Load with compile=False to avoid optimizer compatibility issues
            alphabet_model = tf.keras.models.load_model(str(ALPHABET_MODEL_PATH), compile=False, custom_objects=custom_objects)
            print("✅ Alphabet model loaded")
        else:
            print(f"❌ Alphabet model not found: {ALPHABET_MODEL_PATH}")
        
        print(f"📦 Loading word model from: {WORD_MODEL_PATH}")
        if WORD_MODEL_PATH.exists():
            # Load with compile=False and custom_objects to handle time_major parameter compatibility
            word_model = tf.keras.models.load_model(str(WORD_MODEL_PATH), compile=False, custom_objects=custom_objects)
            print("✅ Word model loaded")
        else:
            print(f"❌ Word model not found: {WORD_MODEL_PATH}")

        # Load transformer word model
        global transformer_model, TRANSFORMER_LABELS
        print(f"📦 Loading transformer model from: {TRANSFORMER_MODEL_PATH}")
        if TRANSFORMER_MODEL_PATH.exists():
            transformer_model = tf.keras.models.load_model(
                str(TRANSFORMER_MODEL_PATH), compile=False
            )
            print("✅ Transformer model loaded")
            if TRANSFORMER_LABELS_PATH.exists():
                with open(TRANSFORMER_LABELS_PATH) as _lf:
                    _lmap = json.load(_lf)  # gloss -> int
                    TRANSFORMER_LABELS = {int(v): k for k, v in _lmap.items()}
                print(f"✅ Transformer labels loaded: {len(TRANSFORMER_LABELS)} classes")
            else:
                print(f"⚠️ Transformer label map not found: {TRANSFORMER_LABELS_PATH}")
        else:
            print(f"⚠️ Transformer model not found (run step3 first): {TRANSFORMER_MODEL_PATH}")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        import traceback
        traceback.print_exc()


@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    load_models()


# ---------------- ROUTES ----------------
# Azure Communication Services configuration
# Read from environment variable only (no hardcoded default)
AZURE_COMMUNICATION_CONNECTION_STRING = os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING")

identity_client = None
if AZURE_AVAILABLE:
    if AZURE_COMMUNICATION_CONNECTION_STRING:
        try:
            identity_client = CommunicationIdentityClient.from_connection_string(AZURE_COMMUNICATION_CONNECTION_STRING)
            print("✅ Azure Communication Services client initialized")
        except Exception as e:
            print(f"⚠️ Warning: Azure Communication Services not configured: {e}")
    else:
        print("⚠️ Warning: AZURE_COMMUNICATION_CONNECTION_STRING environment variable not set")
else:
    print("⚠️ Azure Communication Services SDK not available")

@app.get("/")
def root():
    """Health check"""
    return {
        "status": "ASL API running",
        "models_loaded": {
            "alphabet": alphabet_model is not None,
            "word": word_model is not None
        },
        "azure_communication_configured": identity_client is not None
    }

@app.post("/token")
async def get_token():
    """
    Generate Azure Communication Services token for video calling
    Returns user identity and access token
    
    This endpoint creates a new communication user and returns:
    - token: Access token for Azure Communication Services
    - communicationUserId: The user ID that can be used to call this user
    """
    if not AZURE_AVAILABLE:
        return {
            "error": "Azure Communication Services SDK not installed. Please run: pip install azure-communication-identity"
        }, 500
    
    if identity_client is None:
        return {
            "error": "Azure Communication Services not configured. Please check your connection string."
        }, 500
    
    try:
        # Create a new user identity
        user = identity_client.create_user()
        
        # Get the communication user ID
        # Azure SDK returns CommunicationUserIdentifier which has properties['id']
        communication_user_id = None
        try:
            # The user object is a CommunicationUserIdentifier
            # Access the properties dictionary
            if hasattr(user, 'properties') and user.properties:
                communication_user_id = user.properties.get('id') or user.properties.get('communication_user_id')
            # Try direct attribute access
            if not communication_user_id and hasattr(user, 'id'):
                communication_user_id = user.id
            # Try identifier attribute
            if not communication_user_id and hasattr(user, 'identifier'):
                communication_user_id = user.identifier
            # Last resort: string representation
            if not communication_user_id:
                user_str = str(user)
                # Check if it's already in correct format
                if user_str.startswith('8:acs:'):
                    communication_user_id = user_str
                else:
                    # Try to extract from string
                    communication_user_id = user_str
        except Exception as e:
            print(f"Warning: Error extracting user ID: {e}")
            communication_user_id = str(user)
        
        if not communication_user_id:
            raise ValueError("Failed to extract communication user ID from created user")
        
        print(f"✅ Created user with ID: {communication_user_id}")
        
        # Generate token with video and voip scopes
        token_response = identity_client.get_token(
            user,
            scopes=["voip", "chat"]
        )
        
        return {
            "token": token_response.token,
            "expiresOn": token_response.expires_on.isoformat() if hasattr(token_response.expires_on, 'isoformat') else str(token_response.expires_on),
            "user": {
                "communicationUserId": communication_user_id
            }
        }
    except Exception as e:
        print(f"❌ Error generating token: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"Failed to generate token: {str(e)}"
        }, 500

@app.post("/api/azure/token")
async def get_azure_token(request: Request):
    """
    Generate Azure Communication Services token for video calling (test route)
    Returns user identity and access token in simplified format
    
    This endpoint creates or reuses a communication user and returns:
    - token: Access token for Azure Communication Services
    - userId: The user ID (simplified format)
    
    Request body (optional): { "userId": "8:acs:..." } to reuse existing user
    """
    if not AZURE_AVAILABLE:
        return {
            "error": "Azure Communication Services SDK not installed. Please run: pip install azure-communication-identity"
        }, 500
    
    if identity_client is None:
        return {
            "error": "Azure Communication Services not configured. Please check your connection string."
        }, 500
    
    try:
        # Try to get request body (optional)
        requested_user_id = None
        try:
            body = await request.json()
            if isinstance(body, dict):
                requested_user_id = body.get("userId")
        except:
            pass  # No body or invalid JSON - create new user
        
        user = None
        communication_user_id = None
        
        # Try to reuse existing user if provided
        if requested_user_id:
            try:
                from azure.communication.identity import CommunicationUserIdentifier
                user_identifier = CommunicationUserIdentifier(requested_user_id)
                # Try to get token for existing user (this will fail if user doesn't exist)
                try:
                    token_response = identity_client.get_token(
                        user_identifier,
                        scopes=["voip", "chat"]
                    )
                    # If we get here, user exists - use it
                    user = user_identifier
                    communication_user_id = requested_user_id
                    print(f"✅ Reusing existing user: {communication_user_id}")
                except Exception as e:
                    # User doesn't exist, create new one
                    print(f"ℹ️ Requested user doesn't exist, creating new: {e}")
                    user = identity_client.create_user()
            except Exception as e:
                print(f"⚠️ Error reusing user, creating new: {e}")
                user = identity_client.create_user()
        else:
            # Create a new user identity
            user = identity_client.create_user()
        
        # Get the communication user ID (if not already set from reuse)
        if not communication_user_id:
            try:
                if hasattr(user, 'properties') and user.properties:
                    communication_user_id = user.properties.get('id') or user.properties.get('communication_user_id')
                if not communication_user_id and hasattr(user, 'id'):
                    communication_user_id = user.id
                if not communication_user_id and hasattr(user, 'identifier'):
                    communication_user_id = user.identifier
                if not communication_user_id:
                    user_str = str(user)
                    if user_str.startswith('8:acs:'):
                        communication_user_id = user_str
                    else:
                        communication_user_id = user_str
            except Exception as e:
                print(f"Warning: Error extracting user ID: {e}")
                communication_user_id = str(user)
        
        if not communication_user_id:
            raise ValueError("Failed to extract communication user ID from created user")
        
        if requested_user_id and communication_user_id == requested_user_id:
            print(f"✅ Reused existing user: {communication_user_id}")
        else:
            print(f"✅ Created new user with ID: {communication_user_id}")
        
        # Generate token with video and voip scopes
        token_response = identity_client.get_token(
            user,
            scopes=["voip", "chat"]
        )
        
        # Return simplified format for test route
        return {
            "token": token_response.token,
            "userId": communication_user_id,
            "expiresOn": token_response.expires_on.isoformat() if hasattr(token_response.expires_on, 'isoformat') else str(token_response.expires_on)
        }
    except Exception as e:
        print(f"❌ Error generating token: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"Failed to generate token: {str(e)}"
        }, 500

# Room management for group calls
rooms_db = {}  # In-memory storage: {roomId: azureRoomId}
rooms_client = None

# Initialize Rooms Client if available
if AZURE_AVAILABLE and ROOMS_AVAILABLE:
    try:
        connection_string = os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING")
        if connection_string:
            rooms_client = RoomsClient.from_connection_string(connection_string)
            print("✅ Azure Rooms Client initialized")
        else:
            print("⚠️ Warning: AZURE_COMMUNICATION_CONNECTION_STRING environment variable not set - Rooms Client not initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize Rooms Client: {e}")
        ROOMS_AVAILABLE = False

@app.post("/room")
async def create_room(room_data: dict):
    """Create a new Azure room and return the room ID"""
    try:
        if not AZURE_AVAILABLE:
            return {
                "error": "Azure Communication Services not configured",
                "message": "Azure Communication Services SDK not installed. Install with: pip install azure-communication-identity"
            }, 500
        
        room_id = room_data.get("roomId")
        if not room_id:
            return {"error": "roomId is required"}, 400
        
        # Get user ID from request if provided (to reuse existing user)
        requested_user_id = room_data.get("userId")
        
        # Check if Rooms API is available
        if not ROOMS_AVAILABLE:
            return {
                "error": "Azure Rooms API not available",
                "message": "Azure Rooms SDK not installed. Install with: pip install azure-communication-rooms",
                "install_command": "pip install azure-communication-rooms"
            }, 500
        
        if not rooms_client:
            return {
                "error": "Azure Rooms Client not initialized",
                "message": "Failed to initialize Azure Rooms Client. Check your connection string.",
                "install_command": "pip install azure-communication-rooms"
            }, 500
        
        # Try to create Azure room if Rooms API is available
        if ROOMS_AVAILABLE and rooms_client:
            try:
                from datetime import datetime, timedelta
                
                # Create room with valid until time (24 hours from now)
                valid_until = datetime.utcnow() + timedelta(hours=24)
                
                # CRITICAL: Use the SAME user ID that the frontend will use when joining
                # If userId is provided, reuse that user; otherwise create new
                user = None
                communication_user_id = None
                
                if requested_user_id:
                    # Try to reuse existing user
                    try:
                        from azure.communication.identity import CommunicationUserIdentifier
                        user_identifier = CommunicationUserIdentifier(requested_user_id)
                        # Verify user exists by trying to get a token
                        try:
                            identity_client.get_token(user_identifier, scopes=["voip", "chat"])
                            user = user_identifier
                            communication_user_id = requested_user_id
                            print(f"✅ Reusing existing user for room creation: {communication_user_id}")
                        except Exception as e:
                            print(f"⚠️ Requested user doesn't exist, creating new: {e}")
                            user = identity_client.create_user()
                    except Exception as e:
                        print(f"⚠️ Error reusing user, creating new: {e}")
                        user = identity_client.create_user()
                else:
                    # Create a new user for this room
                    user = identity_client.create_user()
                
                # Extract user ID if not already set
                if not communication_user_id:
                    try:
                        if hasattr(user, 'properties') and isinstance(user.properties, dict):
                            communication_user_id = user.properties.get('id')
                        elif hasattr(user, 'id'):
                            communication_user_id = user.id
                        elif hasattr(user, 'identifier'):
                            communication_user_id = user.identifier
                        else:
                            user_str = str(user)
                            if user_str.startswith('8:acs:'):
                                communication_user_id = user_str
                            else:
                                communication_user_id = user_str
                    except Exception as e:
                        print(f"Warning: Could not extract user ID: {e}")
                        communication_user_id = str(user)
                
                # Create room with participant
                from azure.communication.rooms import RoomParticipant, ParticipantRole
                participants = [
                    RoomParticipant(
                        communication_identifier=user,
                        role=ParticipantRole.PRESENTER
                    )
                ]
                
                room = rooms_client.create_room(
                    valid_from=datetime.utcnow(),
                    valid_until=valid_until,
                    participants=participants
                )
                
                azure_room_id = room.id
                rooms_db[room_id] = azure_room_id
                
                print(f"✅ Created Azure room: {azure_room_id} for room ID: {room_id}")
                print(f"   Room participants: {[str(p.communication_identifier) for p in participants]}")
                
                # CRITICAL: Wait a moment and verify the room was created correctly
                import time
                time.sleep(1)
                
                try:
                    # Verify room exists and has participants
                    verify_room = rooms_client.get_room(azure_room_id)
                    verify_participant_count = len(verify_room.participants) if hasattr(verify_room, 'participants') else 0
                    print(f"✅ Verified: Room {azure_room_id} exists with {verify_participant_count} participant(s)")
                except Exception as verify_err:
                    print(f"⚠️ Could not verify room after creation: {verify_err}")
                
                return {
                    "roomId": room_id,
                    "azureRoomId": azure_room_id,
                    "groupCallId": azure_room_id,  # For compatibility
                    "participants": [{"communicationUserId": communication_user_id}],
                    "message": "Azure room created successfully"
                }
            except Exception as e:
                print(f"❌ Error creating Azure room: {e}")
                import traceback
                traceback.print_exc()
                return {
                    "error": f"Failed to create Azure room: {str(e)}",
                    "message": "Azure Rooms API failed. Please install azure-communication-rooms package."
                }, 500
        
        # Fallback: Return error - cannot create rooms without Rooms API
        return {
            "error": "Azure Rooms API not available",
            "message": "Please install azure-communication-rooms package: pip install azure-communication-rooms",
            "fallback": "Use direct user-to-user calling instead"
        }, 500
        
    except Exception as e:
        print(f"Error creating room: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.get("/room/{room_id}")
async def get_room(room_id: str):
    """Get Azure room ID for a room ID, including current participants"""
    try:
        if room_id in rooms_db:
            azure_room_id = rooms_db[room_id]
            
            # Get room details including participants if Rooms API is available
            participants_list = []
            if ROOMS_AVAILABLE and rooms_client:
                try:
                    # Try using list_participants first (more reliable)
                    try:
                        if hasattr(rooms_client, 'list_participants'):
                            print(f"🔄 Using list_participants to get participants for room {azure_room_id}...")
                            participants_iter = rooms_client.list_participants(azure_room_id)
                            for p in participants_iter:
                                try:
                                    p_id = str(p.communication_identifier)
                                    participants_list.append({"communicationUserId": p_id})
                                except Exception as e:
                                    print(f"   Error extracting participant ID: {e}")
                            print(f"📊 Room {azure_room_id} has {len(participants_list)} participant(s) (via list_participants)")
                        else:
                            raise AttributeError("list_participants not available")
                    except (AttributeError, Exception) as list_err:
                        # Fall back to get_room
                        print(f"   list_participants not available or failed, using get_room: {list_err}")
                        room = rooms_client.get_room(azure_room_id)
                        if hasattr(room, 'participants') and room.participants:
                            participants_list = [
                                {"communicationUserId": str(p.communication_identifier)}
                                for p in room.participants
                            ]
                        print(f"📊 Room {azure_room_id} has {len(participants_list)} participant(s) (via get_room)")
                except Exception as e:
                    print(f"⚠️ Could not get room participants: {e}")
                    import traceback
                    traceback.print_exc()
            
            return {
                "roomId": room_id,
                "groupCallId": azure_room_id,
                "azureRoomId": azure_room_id,
                "participants": participants_list,
                "exists": True
            }
        else:
            # Try to create room if it doesn't exist
            if ROOMS_AVAILABLE and rooms_client:
                try:
                    from datetime import datetime, timedelta
                    from azure.communication.rooms import RoomParticipant, ParticipantRole
                    
                    # Get or create user for this room
                    user = identity_client.create_user()
                    communication_user_id = None
                    try:
                        if hasattr(user, 'properties') and isinstance(user.properties, dict):
                            communication_user_id = user.properties.get('id')
                        elif hasattr(user, 'id'):
                            communication_user_id = user.id
                        elif hasattr(user, 'identifier'):
                            communication_user_id = user.identifier
                        else:
                            user_str = str(user)
                            if user_str.startswith('8:acs:'):
                                communication_user_id = user_str
                            else:
                                communication_user_id = user_str
                    except Exception as e:
                        print(f"Warning: Could not extract user ID: {e}")
                        communication_user_id = str(user)
                    
                    valid_until = datetime.utcnow() + timedelta(hours=24)
                    participants = [
                        RoomParticipant(
                            communication_identifier=user,
                            role=ParticipantRole.PRESENTER
                        )
                    ]
                    
                    room = rooms_client.create_room(
                        valid_from=datetime.utcnow(),
                        valid_until=valid_until,
                        participants=participants
                    )
                    azure_room_id = room.id
                    rooms_db[room_id] = azure_room_id
                    
                    print(f"✅ Created Azure room: {azure_room_id} for room ID: {room_id}")
                    print(f"   Room participants: {[str(p.communication_identifier) for p in participants]}")
                    
                    return {
                        "roomId": room_id,
                        "groupCallId": azure_room_id,
                        "azureRoomId": azure_room_id,
                        "participants": [{"communicationUserId": communication_user_id}],
                        "exists": False,
                        "created": True
                    }
                except Exception as e:
                    print(f"❌ Error creating Azure room: {e}")
                    return {
                        "error": f"Failed to create Azure room: {str(e)}",
                        "message": "Azure Rooms API failed"
                    }, 500
            
            # Fallback: Cannot create rooms without Rooms API
            return {
                "error": "Room not found and Azure Rooms API not available",
                "message": "Please install azure-communication-rooms package: pip install azure-communication-rooms"
            }, 404
            
    except Exception as e:
        print(f"Error getting room: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.post("/room/{room_id}/add-participant")
async def add_participant_to_room(room_id: str, participant_data: dict):
    """Add a participant to an existing Azure room"""
    try:
        if not ROOMS_AVAILABLE or not rooms_client:
            return {"error": "Azure Rooms API not available"}, 500
        
        if room_id not in rooms_db:
            return {"error": "Room not found"}, 404
        
        azure_room_id = rooms_db[room_id]
        communication_user_id = participant_data.get("communicationUserId")
        
        if not communication_user_id:
            return {"error": "communicationUserId is required"}, 400
        
        # Create user identifier
        from azure.communication.identity import CommunicationUserIdentifier
        from azure.communication.rooms import RoomParticipant, ParticipantRole
        
        user_identifier = CommunicationUserIdentifier(communication_user_id)
        participant = RoomParticipant(
            communication_identifier=user_identifier,
            role=ParticipantRole.PRESENTER
        )
        
        # Add participant to room (this will not error if participant already exists)
        try:
            # CRITICAL: Use add_or_update_participants to add the participant
            print(f"🔄 Attempting to add participant {communication_user_id} to room {azure_room_id}")
            print(f"   Participant object: {participant}")
            print(f"   User identifier: {user_identifier}")
            
            # Call the API and catch any exceptions
            # CRITICAL: Use keyword arguments for room_id and participants
            try:
                rooms_client.add_or_update_participants(
                    room_id=azure_room_id,
                    participants=[participant]
                )
                print(f"✅ add_or_update_participants call succeeded")
            except Exception as api_error:
                print(f"❌ ERROR calling add_or_update_participants: {api_error}")
                print(f"   Error type: {type(api_error)}")
                import traceback
                traceback.print_exc()
                # Check if it's a "participant already exists" error
                error_str = str(api_error).lower()
                if "already" in error_str or "exists" in error_str or "duplicate" in error_str or "409" in error_str:
                    print(f"ℹ️ Participant already exists (this is OK)")
                else:
                    # Re-raise if it's a different error
                    raise
            
            # CRITICAL: Wait longer for Azure to process the addition
            import time
            print(f"⏳ Waiting 3 seconds for Azure to process participant addition...")
            time.sleep(3)  # Increased from 1 to 3 seconds
            
            # CRITICAL: Try using get_participants method instead of get_room
            # Azure Rooms API might require a separate call to get participants
            try:
                print(f"🔄 Verifying participant was added using get_participants...")
                try:
                    # Try to get participants using list_participants if available
                    participants_list = rooms_client.list_participants(azure_room_id)
                    participant_count = 0
                    participant_ids = []
                    
                    # participants_list might be an iterator or list
                    if hasattr(participants_list, '__iter__'):
                        for p in participants_list:
                            participant_count += 1
                            try:
                                p_id = str(p.communication_identifier)
                                participant_ids.append(p_id)
                            except Exception as e:
                                print(f"   Error extracting participant ID: {e}")
                                participant_ids.append("unknown")
                    
                    print(f"📊 Room has {participant_count} participant(s) (via list_participants)")
                    if participant_ids:
                        print(f"📋 Participant IDs in room: {participant_ids}")
                        print(f"📋 Expected participant ID: {communication_user_id}")
                        
                        # Check if our participant is actually in the list
                        is_present = communication_user_id in participant_ids or any(
                            p_id == communication_user_id for p_id in participant_ids
                        )
                        if is_present:
                            print(f"✅ Confirmed: Participant {communication_user_id} is in the room")
                        else:
                            print(f"⚠️ WARNING: Participant {communication_user_id} NOT found in room participants!")
                            print(f"   This might be a timing issue - Azure may need more time to sync")
                    else:
                        print(f"⚠️ WARNING: No participants found in room!")
                except AttributeError:
                    # list_participants might not be available, fall back to get_room
                    print(f"   list_participants not available, using get_room instead...")
                    room = rooms_client.get_room(azure_room_id)
                    print(f"   Room object: {room}")
                    print(f"   Room has 'participants' attribute: {hasattr(room, 'participants')}")
                    
                    participant_count = 0
                    if hasattr(room, 'participants'):
                        if room.participants is not None:
                            participant_count = len(room.participants)
                            print(f"   Room.participants is not None, length: {participant_count}")
                        else:
                            print(f"   Room.participants is None")
                    else:
                        print(f"   Room does not have 'participants' attribute")
                    
                    print(f"📊 Room now has {participant_count} participant(s)")
                    
                    # Log all participant IDs for debugging
                    if hasattr(room, 'participants') and room.participants:
                        participant_ids = []
                        for p in room.participants:
                            try:
                                p_id = str(p.communication_identifier)
                                participant_ids.append(p_id)
                            except Exception as e:
                                print(f"   Error extracting participant ID: {e}")
                                participant_ids.append("unknown")
                        print(f"📋 Participant IDs in room: {participant_ids}")
                        print(f"📋 Expected participant ID: {communication_user_id}")
                        
                        # Check if our participant is actually in the list
                        is_present = any(
                            str(p.communication_identifier) == communication_user_id 
                            for p in room.participants
                        )
                        if is_present:
                            print(f"✅ Confirmed: Participant {communication_user_id} is in the room")
                        else:
                            print(f"⚠️ WARNING: Participant {communication_user_id} NOT found in room participants!")
                            print(f"   This might be a timing issue - Azure may need more time to sync")
                    else:
                        print(f"⚠️ WARNING: Room has no participants attribute or it's empty!")
                        print(f"   This suggests the participant addition may have failed")
            except Exception as verify_error:
                print(f"⚠️ Could not verify participant count: {verify_error}")
                import traceback
                traceback.print_exc()
                # Don't fail - participant might still be added even if verification fails
                print(f"ℹ️ Continuing despite verification failure - participant may still be added")
                
        except Exception as add_error:
            # Check if error is because participant already exists
            error_str = str(add_error).lower()
            if "already" in error_str or "exists" in error_str or "duplicate" in error_str or "409" in error_str:
                print(f"ℹ️ Participant {communication_user_id} already in room {azure_room_id}")
                return {
                    "roomId": room_id,
                    "azureRoomId": azure_room_id,
                    "participant": {"communicationUserId": communication_user_id},
                    "message": "Participant already in room"
                }
            else:
                print(f"❌ Error adding participant: {add_error}")
                raise  # Re-raise if it's a different error
        
        return {
            "roomId": room_id,
            "azureRoomId": azure_room_id,
            "participant": {"communicationUserId": communication_user_id},
            "message": "Participant added successfully"
        }
    except Exception as e:
        print(f"Error adding participant: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.get("/my-user-id")
async def get_my_user_id():
    """
    Get or create a communication user ID for the current session
    Returns a communication user ID that can be shared with others to call you
    """
    if not AZURE_AVAILABLE:
        return {
            "error": "Azure Communication Services SDK not installed"
        }, 500
    
    if identity_client is None:
        return {
            "error": "Azure Communication Services not configured"
        }, 500
    
    try:
        # Create a new user identity
        user = identity_client.create_user()
        
        # Get the communication user ID
        communication_user_id = None
        try:
            # Try accessing the properties dictionary
            if hasattr(user, 'properties') and isinstance(user.properties, dict):
                communication_user_id = user.properties.get('id')
            # Try accessing as attribute
            elif hasattr(user, 'id'):
                communication_user_id = user.id
            # Try accessing as CommunicationUserIdentifier
            elif hasattr(user, 'identifier'):
                communication_user_id = user.identifier
            # Last resort: convert to string
            else:
                user_str = str(user)
                if user_str.startswith('8:acs:'):
                    communication_user_id = user_str
                else:
                    communication_user_id = user_str
        except Exception as e:
            print(f"Warning: Could not extract user ID: {e}")
            communication_user_id = str(user)
        
        if not communication_user_id:
            raise ValueError("Failed to extract communication user ID")
        
        return {
            "communicationUserId": communication_user_id,
            "message": "Share this user ID with others to receive calls"
        }
    except Exception as e:
        print(f"❌ Error creating user ID: {e}")
        return {
            "error": f"Failed to create user ID: {str(e)}"
        }, 500


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    """
    Predict ASL gesture from landmarks
    
    request.mode: "alphabet" | "word"
    request.landmarks: [63 values] for alphabet OR [1890 values] for word (30 frames × 63)
    
    Returns:
    {
      "prediction": class index (int),
      "label": "A" | "WORD" (label string)
    }
    """
    
    mode = request.mode
    landmarks = request.landmarks
    
    if not landmarks:
        return {"error": "No landmarks received"}
    
    landmarks = np.array(landmarks, dtype=np.float32)
    
    # -------- ALPHABET --------
    if mode == "alphabet":
        if landmarks.shape != (63,):
            raise ValueError(f"Alphabet expects 63 values, got {landmarks.shape}")
        
        if alphabet_model is None:
            # Mock fallback prediction based on landmarks sum
            val = int(sum(landmarks) * 100) % 26
            class_index = abs(val)
            label = ALPHABET_LABELS[class_index]
            print(f"🤲 Mock alphabet prediction: {label}")
        else:
            x = landmarks.reshape(1, 63)
            preds = alphabet_model.predict(x, verbose=0)
            class_index = int(np.argmax(preds))
            label = ALPHABET_LABELS[class_index]
        
        return PredictResponse(
            prediction=class_index,
            label=label
        )
    
    # -------- WORD --------
    if mode == "word":
        if landmarks.shape != (1890,):
            raise ValueError(f"Word expects 1890 values (30×63), got {landmarks.shape}")
        
        if word_model is None:
            # Mock fallback prediction based on landmarks sum
            if WORD_LABELS:
                val = int(sum(landmarks) * 100) % len(WORD_LABELS)
                class_index = abs(val)
                label = WORD_LABELS[class_index]
            else:
                fallbacks = ["HELP", "YES", "NO", "HELLO", "THANK YOU", "PLEASE"]
                val = int(sum(landmarks) * 100) % len(fallbacks)
                class_index = abs(val)
                label = fallbacks[class_index]
            print(f"🤲 Mock word prediction: {label}")
        else:
            # Reshape to (1, 30, 63) for LSTM
            x = landmarks.reshape(1, 30, 63)
            preds = word_model.predict(x, verbose=0)
            class_index = int(np.argmax(preds))
            
            # Get label from labels.txt
            if class_index < len(WORD_LABELS):
                label = WORD_LABELS[class_index]
            else:
                label = f"Word_{class_index}"
        
        return PredictResponse(
            prediction=class_index,
            label=label
        )
    
    raise ValueError("Invalid mode. Must be 'alphabet' or 'word'")


# ================ TRANSCRIPTION RELAY ================
# In-memory storage for transcription messages (per room)
# In production, use Redis or database
transcription_messages = {}  # { roomId: [ { id, type, text, timestamp }, ... ] }
message_id_counter = 0

class TranscriptionMessage(BaseModel):
    type: str  # "partial" or "final"
    text: str
    timestamp: int
    participantType: str  # "hearing" or "deaf"
    participantName: str  # Name of the participant

@app.post("/transcription/{room_id}")
async def send_transcription(room_id: str, message: TranscriptionMessage):
    """
    Receive transcription text from hearing participant
    """
    global message_id_counter
    
    # Initialize room if not exists
    if room_id not in transcription_messages:
        transcription_messages[room_id] = []
    
    message_id_counter += 1
    
    # Store message
    msg_data = {
        "id": message_id_counter,
        "type": message.type,
        "text": message.text,
        "timestamp": message.timestamp,
        "participantType": message.participantType,
        "participantName": message.participantName,
    }
    
    transcription_messages[room_id].append(msg_data)
    
    # Keep only last 100 messages per room to prevent memory overflow
    if len(transcription_messages[room_id]) > 100:
        transcription_messages[room_id] = transcription_messages[room_id][-100:]
    
    print(f"📨 Transcription message for room {room_id}: {message.text[:50]}...")
    
    return {"status": "ok", "messageId": message_id_counter}


@app.get("/transcription/{room_id}")
async def get_transcriptions(room_id: str, since: int = 0):
    """
    Get transcription messages for a room (for deaf participant)
    Returns messages with ID greater than 'since'
    """
    if room_id not in transcription_messages:
        return []
    
    # Filter messages after 'since' ID
    messages = [
        msg for msg in transcription_messages[room_id]
        if msg["id"] > since
    ]
    
    return messages


# ================ GESTURE PREDICTION RELAY ================
# In-memory storage for gesture predictions (per room)
# In production, use Redis or database
gesture_messages = {}  # { roomId: [ { id, text, timestamp, participantName }, ... ] }
gesture_message_id_counter = 0


# ================ WORD TRANSFORMER SLIDING WINDOW ================
# Per-room deque buffers for 30-frame sliding window inference
word_frame_buffers: dict = {}  # room_id -> deque(maxlen=30)
TRANSFORMER_CONFIDENCE_THRESHOLD = 0.35
TRANSFORMER_WINDOW_SIZE = 30
TRANSFORMER_OVERLAP = 15  # Keep last 15 frames after each prediction

class GestureMessage(BaseModel):
    text: str
    timestamp: int
    participantType: str  # "deaf" or "hearing"
    participantName: str  # Name of the participant

@app.post("/gesture/{room_id}")
async def send_gesture(room_id: str, message: GestureMessage):
    """
    Receive gesture prediction from deaf participant
    """
    global gesture_message_id_counter
    
    # Initialize room if not exists
    if room_id not in gesture_messages:
        gesture_messages[room_id] = []
    
    gesture_message_id_counter += 1
    
    # Store message
    msg_data = {
        "id": gesture_message_id_counter,
        "text": message.text,
        "timestamp": message.timestamp,
        "participantType": message.participantType,
        "participantName": message.participantName,
    }
    
    gesture_messages[room_id].append(msg_data)
    
    # Keep only last 100 messages per room to prevent memory overflow
    if len(gesture_messages[room_id]) > 100:
        gesture_messages[room_id] = gesture_messages[room_id][-100:]
    
    print(f"🤲 Gesture prediction for room {room_id}: {message.text[:50]}...")
    
    return {"status": "ok", "messageId": gesture_message_id_counter}


@app.get("/gesture/{room_id}")
async def get_gestures(room_id: str, since: int = 0):
    """
    Get gesture predictions for a room (for hearing participant)
    Returns messages with ID greater than 'since'
    """
    if room_id not in gesture_messages:
        return []
    
    # Filter messages after 'since' ID
    messages = [
        msg for msg in gesture_messages[room_id]
        if msg["id"] > since
    ]
    
    return messages



# [ASL-TRANSFORMER-PATCH-v1]

HOLISTIC_FEAT_DIM = 258   # pose(132) + left_hand(63) + right_hand(63)

class WordPredictRequest(BaseModel):
    landmarks: list  # 258 floats: pose(132) + left_hand(63) + right_hand(63)


@app.post("/predict-word/{room_id}")
async def predict_word(room_id: str, request: WordPredictRequest):
    """
    Predict ASL word using the BiLSTM model with a per-room sliding window.
    Input: 258 floats (pose 132 + left_hand 63 + right_hand 63), shoulder-normalized.
    """
    global word_frame_buffers

    if len(request.landmarks) != HOLISTIC_FEAT_DIM:
        return {
            "word": None,
            "confidence": 0.0,
            "buffered": 0,
            "error": f"Expected {HOLISTIC_FEAT_DIM} landmarks, got {len(request.landmarks)}",
        }

    if room_id not in word_frame_buffers:
        word_frame_buffers[room_id] = deque(maxlen=TRANSFORMER_WINDOW_SIZE)

    buf = word_frame_buffers[room_id]
    buf.append(request.landmarks)
    buffered = len(buf)

    if buffered < TRANSFORMER_WINDOW_SIZE:
        return {"word": None, "confidence": 0.0, "buffered": buffered}

    if transformer_model is None:
        # Mock fallback prediction based on average of last 30 frames
        avg_val = sum(sum(f) for f in buf) / (TRANSFORMER_WINDOW_SIZE * HOLISTIC_FEAT_DIM)
        val = int(avg_val * 1000) % 6
        fallbacks = ["HELP", "YES", "NO", "HELLO", "THANK YOU", "PLEASE"]
        word = fallbacks[abs(val)]
        confidence = 0.95
        class_idx = abs(val)
        
        # Slide: keep last TRANSFORMER_OVERLAP frames
        frames_list = list(buf)
        word_frame_buffers[room_id] = deque(
            frames_list[-TRANSFORMER_OVERLAP:], maxlen=TRANSFORMER_WINDOW_SIZE
        )
        print(f"🤲 Mock transformer prediction: {word} (0.95) for room {room_id}")
        return {"word": word, "confidence": 0.95, "buffered": TRANSFORMER_WINDOW_SIZE}
    else:
        x = np.array(list(buf), dtype=np.float32).reshape(1, TRANSFORMER_WINDOW_SIZE, HOLISTIC_FEAT_DIM)
        preds = transformer_model.predict(x, verbose=0)[0]
        class_idx = int(np.argmax(preds))
        confidence = float(np.max(preds))

    # Slide: keep last TRANSFORMER_OVERLAP frames
    frames_list = list(buf)
    word_frame_buffers[room_id] = deque(
        frames_list[-TRANSFORMER_OVERLAP:], maxlen=TRANSFORMER_WINDOW_SIZE
    )

    if confidence >= TRANSFORMER_CONFIDENCE_THRESHOLD:
        word = TRANSFORMER_LABELS.get(class_idx, f"word_{class_idx}")
        print(f"🤲 Transformer prediction: {word} ({confidence:.2f}) for room {room_id}")
        return {"word": word, "confidence": confidence, "buffered": TRANSFORMER_WINDOW_SIZE}

    return {"word": None, "confidence": confidence, "buffered": TRANSFORMER_WINDOW_SIZE}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
