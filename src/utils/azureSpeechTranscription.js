/**
 * Azure Speech-to-Text Transcription Service
 * Runs on HEARING participant's side to transcribe their own voice
 * and send text to DEAF participant
 */

import * as sdk from "microsoft-cognitiveservices-speech-sdk";

class TranscriptionService {
  constructor() {
    this.recognizer = null;
    this.isRunning = false;
    this.onTranscriptionCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Start transcription using local microphone
   * @param {string} speechKey - Azure Speech API key
   * @param {string} region - Azure region
   * @param {Function} onTranscription - Callback for transcription results
   * @param {Function} onError - Callback for errors
   */
  async startTranscription(speechKey, region, onTranscription, onError) {
    if (this.isRunning) {
      console.warn("⚠️ Transcription already running");
      return;
    }

    try {
      console.log("🎤 Starting hearing participant transcription...");
      
      this.onTranscriptionCallback = onTranscription;
      this.onErrorCallback = onError;

      // Azure Speech SDK will request microphone access automatically
      // No need to manually call getUserMedia
      console.log("🎤 Initializing Azure Speech SDK with default microphone...");

      // Create Azure Speech config
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, region);
      speechConfig.speechRecognitionLanguage = "en-US";
      
      // Enable detailed results (optional - for better punctuation)
      try {
        speechConfig.enableDictation();
      } catch (e) {
        console.warn("Could not enable dictation:", e);
      }

      // Create audio config from default microphone
      // Use fromDefaultMicrophoneInput() - this is the correct method name
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Handle recognizing (partial/interim results)
      this.recognizer.recognizing = (s, e) => {
        if (e.result && e.result.text) {
          console.log("🎤 Recognizing:", e.result.text);
          if (this.onTranscriptionCallback) {
            this.onTranscriptionCallback({
              type: "partial",
              text: e.result.text,
              timestamp: Date.now(),
            });
          }
        }
      };

      // Handle recognized (final results)
      this.recognizer.recognized = (s, e) => {
        if (e.result && e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const text = e.result.text.trim();
          if (text) {
            console.log("✅ Recognized (final):", text);
            if (this.onTranscriptionCallback) {
              this.onTranscriptionCallback({
                type: "final",
                text: text,
                timestamp: Date.now(),
              });
            }
          }
        } else if (e.result.reason === sdk.ResultReason.NoMatch) {
          console.log("ℹ️ No speech recognized");
        }
      };

      // Handle errors
      this.recognizer.canceled = (s, e) => {
        console.error("❌ Recognition canceled:", e.errorDetails);
        if (e.errorCode !== sdk.CancellationErrorCode.NoError) {
          if (this.onErrorCallback) {
            this.onErrorCallback(e.errorDetails);
          }
        }
      };

      // Handle session stopped
      this.recognizer.sessionStopped = (s, e) => {
        console.log("📴 Recognition session stopped");
        this.isRunning = false;
      };

      // Start continuous recognition
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("✅ Transcription started successfully");
          this.isRunning = true;
        },
        (err) => {
          console.error("❌ Failed to start transcription:", err);
          this.isRunning = false;
          if (this.onErrorCallback) {
            this.onErrorCallback(err);
          }
        }
      );

    } catch (error) {
      console.error("❌ Error starting transcription:", error);
      this.isRunning = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      throw error;
    }
  }

  /**
   * Stop transcription
   */
  async stopTranscription() {
    if (!this.isRunning || !this.recognizer) {
      console.log("ℹ️ Transcription not running");
      return;
    }

    try {
      console.log("⏹️ Stopping transcription...");
      
      return new Promise((resolve) => {
        this.recognizer.stopContinuousRecognitionAsync(
          () => {
            console.log("✅ Transcription stopped");
            this.recognizer.close();
            this.recognizer = null;
            this.isRunning = false;
            
            // Azure SDK handles microphone cleanup automatically
            console.log("✅ Microphone released");
            
            resolve();
          },
          (err) => {
            console.error("❌ Error stopping transcription:", err);
            this.isRunning = false;
            resolve();
          }
        );
      });
    } catch (error) {
      console.error("❌ Error in stopTranscription:", error);
      this.isRunning = false;
    }
  }

  /**
   * Check if transcription is running
   */
  isTranscribing() {
    return this.isRunning;
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();

