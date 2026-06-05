export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-dvh" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      </div>
    </div>
  )
}
