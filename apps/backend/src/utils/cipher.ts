async function encrypt(data: string, key: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const baseForIv = encoder.encode(data + key);
    const ivHash = await crypto.subtle.digest('SHA-256', baseForIv);
    const iv = new Uint8Array(ivHash).slice(0, 12);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv).buffer as ArrayBuffer },
      cryptoKey,
      encodedData
    );

    const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);

    // Convert to base64 safely
    const base64 = Buffer.from(combined).toString("base64");

    // Make URL-safe
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    console.error("Encryption error:", err);
    throw err;
  }
}

async function decrypt(encryptedData: string, key: string): Promise<string> {
  try {
    // Restore base64 padding and convert URL-safe chars
    const base64 = encryptedData
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        encryptedData.length + ((4 - (encryptedData.length % 4)) % 4),
        "="
      );

    // Use Buffer for safer base64 decoding
    const combined = Buffer.from(base64, "base64");
    const combinedArray = new Uint8Array(combined);

    // Extract the IV that was used for encryption
    const iv = combinedArray.slice(0, 12);
    const encrypted = combinedArray.slice(12);

    // Import the same key used for encryption
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // Use the extracted IV and key to decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv).buffer as ArrayBuffer },
      cryptoKey,
      encrypted.buffer as ArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Decryption error:", err);
    throw err;
  }
}

export { encrypt, decrypt };