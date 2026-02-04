/**
 * Algoritmo de ofuscación simétrica utilizando XOR y codificación Base64
 */

export const obfuscate = (text: string, key: string): string => {
  if (!text) return "";
  const effectiveKey = key || "default_key";
  const charData = text.split('').map((c, i) => 
    c.charCodeAt(0) ^ effectiveKey.charCodeAt(i % effectiveKey.length)
  );
  // Usamos btoa para asegurar que el resultado sea un string transportable
  return btoa(String.fromCharCode(...charData));
};

export const deobfuscate = (encoded: string, key: string): string => {
  if (!encoded) return "";
  const effectiveKey = key || "default_key";
  try {
    const decoded = atob(encoded);
    const charData = decoded.split('').map((c, i) => 
      c.charCodeAt(0) ^ effectiveKey.charCodeAt(i % effectiveKey.length)
    );
    return String.fromCharCode(...charData);
  } catch (e) {
    return "Error: Formato inválido o clave incorrecta";
  }
};