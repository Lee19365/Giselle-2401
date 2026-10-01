

const SALT_LENGTH = 16;
const ITERATIONS = 600_000;
const HASH_LENGTH = 256; // Longitud en bits
const HASH_ALGORITHM = "SHA-256";

// Utilidad para generar una nueva sal
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Convertir Uint8Array a String en Base64
function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) { 
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

// Convertir String en Base64 a Uint8Array
function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

// Derivar Hash desde Contraseña y Sal (PBKDF2) - Privado
async function hashPassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
    const passwordBytes = new TextEncoder().encode(password);

    const key = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: ITERATIONS,
            hash: HASH_ALGORITHM,
        },
        key,
        HASH_LENGTH
    );

    return new Uint8Array(hashBuffer);
}

// Verificar si la contraseña coincide con el hash almacenado (bytes) - Privado
async function verifyPasswordBytes(
    password: string,
    salt: Uint8Array,
    hash: Uint8Array
): Promise<boolean> {
    const calculatedHash = await hashPassword(password, salt);

    if (calculatedHash.length !== hash.length) {
        return false;
    }

    let mismatch = 0;
    for (let i = 0; i < calculatedHash.length; i++) {
        mismatch |= calculatedHash[i] ^ hash[i];
    }

    return mismatch === 0;
}

// --- Funciones Públicas API ---

/**
 * Genera un nuevo salt y calcula el hash de la contraseña entregando ambos en formato Base64.
 */
export async function createPasswordHash(
    password: string
): Promise<{ hash: string; salt: string }> {
    const saltBytes = generateSalt();
    const hashBytes = await hashPassword(password, saltBytes);

    return {
        hash: bytesToBase64(hashBytes),
        salt: bytesToBase64(saltBytes),
    };
}

/**
 * Compara una contraseña plana contra el hash y salt almacenados en Base64.
 */
export async function verifyPassword(
    password: string,
    hash: string,
    salt: string
): Promise<boolean> {
    const hashBytes = base64ToBytes(hash);
    const saltBytes = base64ToBytes(salt);

    return verifyPasswordBytes(password, saltBytes, hashBytes);
}