/**
 * Azure Text-to-Speech Service
 * Converts text to speech using Azure Speech SDK
 * Used for Speech Assistant card in Hearing participant view
 */

import * as sdk from "microsoft-cognitiveservices-speech-sdk";

class TextToSpeechService {
  constructor() {
    this.synthesizer = null;
    this.isSpeaking = false;
    this.currentAudioContext = null;
    this.currentAudioSource = null;
    this.speechKey = null;
    this.region = null;
  }

  /**
   * Initialize the TTS service with Azure credentials
   * @param {string} speechKey - Azure Speech API key
   * @param {string} region - Azure region
   */
  initialize(speechKey, region) {
    this.speechKey = speechKey || import.meta.env.VITE_AZURE_SPEECH_KEY;
    this.region = region || import.meta.env.VITE_AZURE_REGION || "westeurope";

    if (!this.speechKey || this.speechKey.trim() === "") {
      console.error("❌ Azure Speech API key not configured for TTS");
      return false;
    }

    console.log("🔊 Text-to-Speech service initialized");
    return true;
  }

  /**
   * Convert text to speech and play it
   * @param {string} text - Text to convert to speech
   * @param {string} voiceName - Voice name (default: en-US-JennyNeural)
   * @returns {Promise<void>}
   */
  async speak(text, voiceName = "en-US-JennyNeural") {
    if (!text || text.trim() === "") {
      console.warn("⚠️ Empty text provided to TTS");
      return;
    }

    if (!this.speechKey || !this.region) {
      console.error("❌ TTS not initialized. Call initialize() first.");
      return;
    }

    // Stop any currently playing audio
    this.stop();

    try {
      console.log(`🔊 Speaking: "${text}"`);

      // Create speech config
      const speechConfig = sdk.SpeechConfig.fromSubscription(this.speechKey, this.region);
      speechConfig.speechSynthesisVoiceName = voiceName;

      // Create synthesizer
      // Use browser audio output (no need for AudioConfig)
      this.synthesizer = new sdk.SpeechSynthesizer(speechConfig);

      this.isSpeaking = true;

      // Synthesize speech
      return new Promise((resolve, reject) => {
        this.synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              console.log("✅ Speech synthesis completed");
              this.isSpeaking = false;
              this.cleanup();
              resolve();
            } else if (result.reason === sdk.ResultReason.Canceled) {
              const cancellation = sdk.CancellationDetails.fromResult(result);
              console.error("❌ Speech synthesis canceled:", cancellation.reason);
              if (cancellation.reason === sdk.CancellationReason.Error) {
                console.error("❌ Error details:", cancellation.errorDetails);
              }
              this.isSpeaking = false;
              this.cleanup();
              reject(new Error(cancellation.errorDetails || "Speech synthesis canceled"));
            }
          },
          (error) => {
            console.error("❌ Speech synthesis error:", error);
            this.isSpeaking = false;
            this.cleanup();
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error("❌ Error in speak():", error);
      this.isSpeaking = false;
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop current speech synthesis
   * CREDIT-SAFE: Immediately stops and cleans up to prevent any background usage
   */
  stop() {
    if (this.synthesizer) {
      try {
        this.synthesizer.stopSpeakingAsync(
          () => {
            console.log("⏹️ Speech synthesis stopped");
          },
          (err) => {
            console.warn("⚠️ Error stopping speech:", err);
          }
        );
      } catch (error) {
        console.warn("⚠️ Error in stop():", error);
      }
      // CREDIT-SAFE: Always cleanup to prevent background usage
      this.cleanup();
    }
    this.isSpeaking = false;
  }

  /**
   * Clean up synthesizer
   */
  cleanup() {
    if (this.synthesizer) {
      try {
        this.synthesizer.close();
      } catch (error) {
        console.warn("⚠️ Error closing synthesizer:", error);
      }
      this.synthesizer = null;
    }
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking() {
    return this.isSpeaking;
  }
}

// Export singleton instance
export const textToSpeechService = new TextToSpeechService();

