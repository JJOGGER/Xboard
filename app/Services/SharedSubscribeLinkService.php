<?php

namespace App\Services;

class SharedSubscribeLinkService
{
    private const VERSION = 'v1';
    private const IV_LENGTH = 12; // AES-256-GCM recommended IV length
    private const TAG_LENGTH = 16;

    private string $secret;

    public function __construct(?string $secret = null)
    {
        $raw = $secret ?? (string) config('shared_subscribe_link.secret', '');
        if (is_string($raw) && str_starts_with($raw, 'base64:')) {
            $decoded = base64_decode(substr($raw, 7), true);
            $this->secret = $decoded === false ? '' : $decoded;
        } else {
            $this->secret = (string) $raw;
        }
    }

    /**
     * Build share link:
     *   xboard://shared-subscribe?t={token}
     */
    public function buildDeepLink(array $payload): string
    {
        $token = $this->encode($payload);
        return 'xboard://shared-subscribe?t=' . rawurlencode($token);
    }

    /**
     * Encode payload into token.
     * Payload keys (recommended):
     * - subscribe_url: string
     * - user_id: int|string
     * - email: string
     * - expire_at: int (unix seconds)
     */
    public function encode(array $payload): string
    {
        $this->assertConfigured();

        $payload['ver'] = self::VERSION;

        $plaintext = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($plaintext === false) {
            throw new \RuntimeException('Failed to encode payload as JSON');
        }

        $iv = random_bytes(self::IV_LENGTH);

        $keyEnc = $this->deriveKey('enc', 32);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $keyEnc,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            self::VERSION,
            self::TAG_LENGTH
        );

        if ($ciphertext === false || $tag === '') {
            throw new \RuntimeException('Failed to encrypt token payload');
        }

        $body = self::VERSION . '.' . $this->b64url($iv) . '.' . $this->b64url($ciphertext) . '.' . $this->b64url($tag);

        $keyMac = $this->deriveKey('mac', 32);
        $sig = hash_hmac('sha256', $body, $keyMac, true);

        return $body . '.' . $this->b64url($sig);
    }

    /**
     * Decode token and verify signature, then decrypt.
     */
    public function decode(string $token): array
    {
        $this->assertConfigured();

        $parts = explode('.', $token);
        if (count($parts) !== 5) {
            throw new \InvalidArgumentException('Invalid token format');
        }

        [$ver, $ivB64, $ctB64, $tagB64, $sigB64] = $parts;
        if ($ver !== self::VERSION) {
            throw new \InvalidArgumentException('Unsupported token version');
        }

        $body = $ver . '.' . $ivB64 . '.' . $ctB64 . '.' . $tagB64;

        $keyMac = $this->deriveKey('mac', 32);
        $expectedSig = hash_hmac('sha256', $body, $keyMac, true);
        $sig = $this->b64urlDecode($sigB64);

        if ($sig === null || !hash_equals($expectedSig, $sig)) {
            throw new \InvalidArgumentException('Invalid token signature');
        }

        $iv = $this->b64urlDecode($ivB64);
        $ciphertext = $this->b64urlDecode($ctB64);
        $tag = $this->b64urlDecode($tagB64);

        if ($iv === null || $ciphertext === null || $tag === null) {
            throw new \InvalidArgumentException('Invalid token encoding');
        }

        if (strlen($iv) !== self::IV_LENGTH || strlen($tag) !== self::TAG_LENGTH) {
            throw new \InvalidArgumentException('Invalid token parameters');
        }

        $keyEnc = $this->deriveKey('enc', 32);
        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $keyEnc,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            self::VERSION
        );

        if ($plaintext === false) {
            throw new \InvalidArgumentException('Token decryption failed');
        }

        $payload = json_decode($plaintext, true);
        if (!is_array($payload)) {
            throw new \InvalidArgumentException('Invalid token payload');
        }

        return $payload;
    }

    private function assertConfigured(): void
    {
        if ($this->secret === '') {
            throw new \RuntimeException('SHARED_SUBSCRIBE_LINK_SECRET is not configured');
        }
    }

    private function deriveKey(string $purpose, int $length): string
    {
        // Simple HKDF-like derivation using HMAC-SHA256.
        $raw = hash_hmac('sha256', $purpose . '|' . self::VERSION, $this->secret, true);
        if ($length <= 32) {
            return substr($raw, 0, $length);
        }
        // Expand if needed
        $out = $raw;
        while (strlen($out) < $length) {
            $out .= hash_hmac('sha256', $out, $this->secret, true);
        }
        return substr($out, 0, $length);
    }

    private function b64url(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }

    private function b64urlDecode(string $b64url): ?string
    {
        $b64 = strtr($b64url, '-_', '+/');
        $pad = strlen($b64) % 4;
        if ($pad > 0) {
            $b64 .= str_repeat('=', 4 - $pad);
        }
        $decoded = base64_decode($b64, true);
        return $decoded === false ? null : $decoded;
    }
}
