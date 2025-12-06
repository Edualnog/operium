
import React from 'react'

interface ProductLabelProps {
    product: {
        nome: string
        codigo: string
        tamanho?: string
        cor?: string
    }
}

export const ProductLabel = React.forwardRef<HTMLDivElement, ProductLabelProps>(
    ({ product }, ref) => {
        return (
            <div
                ref={ref}
                style={{
                    width: '50mm',
                    height: '30mm',
                    padding: '2mm',
                    border: '1px solid #000',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    pageBreakAfter: 'always'
                }}
                className="print-label"
            >
                <h3
                    style={{
                        margin: '0 0 2px 0',
                        fontSize: '10px',
                        textAlign: 'center',
                        maxHeight: '12px',
                        overflow: 'hidden',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {product.nome}
                </h3>

                {/* Placeholder for QR Code - Using a public API for demonstration or a simple box */}
                <div style={{ margin: '2px 0' }}>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${product.codigo}`}
                        alt="QR Code"
                        style={{ width: '40px', height: '40px' }}
                    />
                </div>

                <div style={{ fontSize: '8px', fontWeight: 'bold' }}>
                    {product.codigo}
                </div>

                <div style={{ fontSize: '7px', marginTop: '1px' }}>
                    {product.tamanho ? `${product.tamanho}` : ''}
                    {product.tamanho && product.cor ? ' - ' : ''}
                    {product.cor ? `${product.cor}` : ''}
                </div>
            </div>
        )
    }
)

ProductLabel.displayName = "ProductLabel"
