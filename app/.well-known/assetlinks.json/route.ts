import { NextResponse } from 'next/server'

/**
 * Digital Asset Links for TWA (Trusted Web Activity)
 *
 * Este arquivo permite que o app Android (TWA) seja verificado como
 * pertencente ao mesmo domínio do site.
 *
 * Após gerar o APK com PWABuilder ou Bubblewrap, você receberá o
 * SHA256 fingerprint da chave de assinatura. Atualize a variável
 * de ambiente TWA_SHA256_FINGERPRINT com esse valor.
 *
 * Formato do fingerprint: "XX:XX:XX:...:XX" (64 caracteres hex separados por :)
 */
export async function GET() {
    // SHA256 fingerprint da chave de assinatura do APK
    // Será gerado quando você criar o APK com PWABuilder
    const sha256Fingerprint = process.env.TWA_SHA256_FINGERPRINT ||
        // Placeholder - substituir pelo fingerprint real após gerar o APK
        '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'

    // Package name do app Android (será definido no PWABuilder)
    const packageName = process.env.TWA_PACKAGE_NAME || 'com.operium.campo'

    const assetLinks = [
        {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
                namespace: 'android_app',
                package_name: packageName,
                sha256_cert_fingerprints: [sha256Fingerprint],
            },
        },
    ]

    return NextResponse.json(assetLinks, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400', // Cache por 24h
        },
    })
}
