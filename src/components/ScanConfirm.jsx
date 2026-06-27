import { useEffect, useState } from 'react'

export default function ScanConfirm() {
  const [parapheur, setParapheur] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const nameHash = params.get('name')

  useEffect(() => {
    if (!id || !nameHash) {
      setError('QR code invalide')
      setLoading(false)
      return
    }

    validateQR()
  }, [id, nameHash])

  async function validateQR() {
    try {
      const result = await fetch(`/api/parapheurs/${id}/qr/validate/${nameHash}`)
      const data = await result.json()

      if (!result.ok) {
        setError(data.error || 'QR code invalide')
        setLoading(false)
        return
      }

      setParapheur(data.objet)
      setTimeout(() => {
        window.location.href = `/?id=${id}`
      }, 2000)
    } catch (err) {
      setError(err.message || 'Erreur de validation')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cs-bg)',
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 40,
        textAlign: 'center',
        maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--cs-bleu)', marginBottom: 20 }}>
          Vérification QR
        </div>

        {error ? (
          <div style={{ color: 'var(--cs-rouge)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>❌ Erreur</div>
            <div style={{ fontSize: 13, color: 'var(--cs-muted)' }}>{error}</div>
            <button
              onClick={() => window.history.back()}
              style={{
                marginTop: 20,
                padding: '10px 20px',
                background: 'var(--cs-bleu)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              Retour
            </button>
          </div>
        ) : parapheur ? (
          <div style={{ color: 'var(--cs-vert)', animation: 'pulse 1s' }}>
            <div style={{ fontSize: 40, marginBottom: 15 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Dossier trouvé!</div>
            <div style={{ fontSize: 14, color: '#333', marginBottom: 20 }}>
              {parapheur}
            </div>
            <div style={{ fontSize: 12, color: 'var(--cs-muted)' }}>Ouverture...</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: 'var(--cs-muted)' }}>Vérification en cours...</div>
            <div style={{ marginTop: 20, fontSize: 40 }}>⏳</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
