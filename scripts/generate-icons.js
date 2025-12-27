/**
 * Script para gerar ícones PWA em múltiplos tamanhos
 * Usa sharp para redimensionar o ícone 512x512 existente
 * 
 * Uso: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SOURCE_ICON = path.join(ICONS_DIR, 'icon-512.png');

// Tamanhos necessários para PWA
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Tamanhos para ícones maskable (com área segura)
const MASKABLE_SIZES = [192, 512];

async function generateIcons() {
    console.log('📱 Gerando ícones PWA...');

    // Verificar se o ícone fonte existe
    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('❌ Ícone fonte não encontrado:', SOURCE_ICON);
        process.exit(1);
    }

    // Gerar ícones padrão
    for (const size of SIZES) {
        const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);

        try {
            await sharp(SOURCE_ICON)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Gerado: icon-${size}.png`);
        } catch (err) {
            console.error(`❌ Erro ao gerar icon-${size}.png:`, err.message);
        }
    }

    // Gerar ícones maskable (com padding para safe zone)
    for (const size of MASKABLE_SIZES) {
        const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}.png`);

        // Maskable icons precisam de 20% de padding (safe zone)
        const iconSize = Math.floor(size * 0.8);
        const padding = Math.floor((size - iconSize) / 2);

        try {
            await sharp(SOURCE_ICON)
                .resize(iconSize, iconSize, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .extend({
                    top: padding,
                    bottom: padding,
                    left: padding,
                    right: padding,
                    background: { r: 75, g: 107, b: 251, alpha: 1 } // #4B6BFB - cor tema
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Gerado: icon-maskable-${size}.png`);
        } catch (err) {
            console.error(`❌ Erro ao gerar icon-maskable-${size}.png:`, err.message);
        }
    }

    // Gerar ícones de atalho
    const shortcutIcons = [
        { name: 'shortcut-report', emoji: '📋' },
        { name: 'shortcut-expense', emoji: '💰' }
    ];

    for (const shortcut of shortcutIcons) {
        const outputPath = path.join(ICONS_DIR, `${shortcut.name}.png`);

        try {
            // Para shortcuts, usar o ícone base redimensionado
            await sharp(SOURCE_ICON)
                .resize(96, 96, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Gerado: ${shortcut.name}.png`);
        } catch (err) {
            console.error(`❌ Erro ao gerar ${shortcut.name}.png:`, err.message);
        }
    }

    console.log('\n🎉 Geração de ícones concluída!');
    console.log('📂 Diretório:', ICONS_DIR);
}

generateIcons().catch(console.error);
