type AvatarProps = {
  size?: number
}

export function Avatar({ size = 34 }: AvatarProps) {
  return (
    <span
      aria-label="Usuário"
      role="img"
      style={{ width: size, height: size }}
      className="v-avatar"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.8 19c.9-3.2 3.1-5 6.2-5s5.3 1.8 6.2 5" />
      </svg>
    </span>
  )
}
