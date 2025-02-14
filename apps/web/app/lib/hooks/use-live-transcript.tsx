
import { useState, useEffect, useCallback } from "react";
import { useQueue } from "@uidotdev/usehooks";
import { LiveClient, LiveTranscriptionEvents, createClient } from "@deepgram/sdk";

export function useLiveTranscript() {

    const { add, remove, first, size, queue } = useQueue<any>([]);
    const [apiKey, _] = useState<string | null>("");
    const [connection, setConnection] = useState<LiveClient | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [micOpen, setMicOpen] = useState(false);
    const [microphone, setMicrophone] = useState<MediaRecorder | null>(null);
    const [userMedia, setUserMedia] = useState<MediaStream | null>(null);
    const [caption, setCaption] = useState<string>("");
    const [status, setStatus] = useState<string>("Not Connected");
      // Initialize Deepgram connection
  const initializeConnection = useCallback(() => {
    if (!apiKey) return null;

    const deepgram = createClient(apiKey);
    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "en",
      smart_format: true,
      interim_results: true,
      punctuate: true,
      diarize: true,
      utterances: true,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      setStatus("Connected");
      setIsListening(true);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      setStatus("Not Connected");
      setIsListening(false);
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error("Deepgram error:", error);
      setStatus("Error occurred");
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (data.is_final) {
        if (transcript && transcript.trim() !== "") {
          setCaption((prev) => prev + " " + transcript);
        }
      }
    });

    return connection;
  }, [apiKey]);

  const toggleMicrophone = useCallback(async () => {
    if (microphone && userMedia) {
      setUserMedia(null);
      setMicrophone(null);
      microphone.stop();
      if (connection) {
        connection.finish();
        setConnection(null);
      }
    } else {
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const microphone = new MediaRecorder(userMedia);
      microphone.start(250);

      microphone.onstart = () => {
        setMicOpen(true);
        // Create new connection when starting microphone
        const newConnection = initializeConnection();
        if (newConnection) {
          setConnection(newConnection);
        }
      };

      microphone.onstop = () => {
        setMicOpen(false);
      };

      microphone.ondataavailable = (e) => {
        add(e.data);
      };

      setUserMedia(userMedia);
      setMicrophone(microphone);
    }
  }, [add, microphone, userMedia, connection, initializeConnection]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      if (size > 0 && !isProcessing && isListening && connection) {
        setIsProcessing(true);
        try {
          const blob = first;
          if (blob) {
            connection.send(blob);
          }
          remove();
        } catch (error) {
          console.error("Error processing audio:", error);
        }
        setIsProcessing(false);
      }
    };

    const interval = setInterval(processQueue, 100);
    return () => clearInterval(interval);
  }, [connection, queue, remove, first, size, isProcessing, isListening]);

  return {
    toggleMicrophone,
    caption,
    status,
    isListening,
    isLoading,
  };
}