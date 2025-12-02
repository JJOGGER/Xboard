<?php

namespace App\Services;

use App\Exceptions\ApiException;

class DeviceIdCrypto
{
    /**
     * 获取 AES-256-GCM 密钥
     *
     * @return string
     */
    protected static function getKey(): string
    {
        $key = config('device.device_secret');

        if (!$key) {
            throw new \RuntimeException('DEVICE_ID_SECRET is not configured');
        }

        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, 7));
        }

        if ($key === false || strlen($key) !== 32) {
            throw new \RuntimeException('Device secret key length must be 32 bytes');
        }

        return $key;
    }

    /**
     * 解密 header 中的 nonce 并返回 deviceId
     *
     * @param string|null $nonceHeader
     * @return string|null
     * @throws ApiException
     */
    public static function decryptNonceToDeviceId(?string $nonceHeader): ?string
    {
        if ($nonceHeader === null || $nonceHeader === '') {
            return null;
        }

        $raw = base64_decode($nonceHeader, true);
        if ($raw === false || strlen($raw) <= (12 + 16)) {
            throw new ApiException(__('Invalid device token format'));
        }

        // GCM 推荐 12 字节 IV，最后 16 字节为 TAG
        $iv = substr($raw, 0, 12);
        $tag = substr($raw, -16);
        $ciphertext = substr($raw, 12, -16);

        $key = self::getKey();

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            throw new ApiException(__('Device token verification failed'));
        }

        $prefix = 'deviceID_';
        if (!str_starts_with($plaintext, $prefix)) {
            throw new ApiException(__('Invalid device token content'));
        }

        $deviceId = substr($plaintext, strlen($prefix));
        if ($deviceId === '') {
            throw new ApiException(__('Device ID cannot be empty'));
        }

        return $deviceId;
    }
}


