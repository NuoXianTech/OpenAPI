<template>
  <div class="auth-shell">
    <main class="auth-panel">
      <div class="auth-form-wrap">
        <slot />
      </div>
    </main>
  </div>
</template>

<style>
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(1200px 600px at 15% 20%, rgba(17, 17, 19, 0.06), transparent 60%),
    radial-gradient(900px 420px at 85% 30%, rgba(35, 197, 94, 0.10), transparent 55%),
    linear-gradient(180deg, oklch(0.989 0.003 286.351) 0%, oklch(0.972 0.005 274.966) 100%);
}

.auth-panel {
  display: grid;
  place-items: center;
  padding: 32px 20px;
  width: 100%;
}

.auth-form-wrap {
  width: 100%;
  max-width: 400px;
  animation: authFadeInUp 0.45s ease-out;
}

.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  text-align: center;
}

.auth-brand__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  box-shadow: 0 4px 12px rgba(17, 17, 19, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.auth-brand__title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--ui-text-highlighted);
}

.auth-brand__subtitle {
  margin: 0;
  font-size: 13.5px;
  color: var(--ui-text-muted);
  line-height: 1.55;
  max-width: 320px;
}

.auth-card {
  border-radius: 16px;
  background: color-mix(in srgb, var(--ui-bg-elevated) 92%, transparent);
  backdrop-filter: blur(10px);
  border-color: var(--ui-border);
  box-shadow: 0 10px 30px -12px rgba(17, 17, 19, 0.10);
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ui-text-dimmed);
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--ui-border);
}

.auth-footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 18px;
  font-size: 13px;
  color: var(--ui-text-muted);
}

.auth-footer-links a,
.auth-footer-links button {
  color: var(--ui-text-muted);
  transition: color 160ms ease;
}

.auth-footer-links a:hover,
.auth-footer-links button:hover {
  color: var(--ui-text);
}

.auth-consent {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}

.auth-consent__text {
  margin: 0;
}

.auth-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid transparent;
}

.auth-message--error {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 8%, transparent);
  border-color: color-mix(in srgb, var(--red) 18%, transparent);
}

.auth-message--success {
  color: var(--green);
  background: color-mix(in srgb, var(--green) 8%, transparent);
  border-color: color-mix(in srgb, var(--green) 20%, transparent);
}

.auth-message__icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.auth-success-illustration {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  margin: 0 auto 4px;
  color: var(--green);
  background: color-mix(in srgb, var(--green) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--green) 22%, transparent);
}

.dark .auth-shell {
  background:
    radial-gradient(1200px 600px at 15% 20%, rgba(255, 255, 255, 0.06), transparent 60%),
    radial-gradient(900px 420px at 85% 30%, rgba(35, 197, 94, 0.14), transparent 55%),
    linear-gradient(180deg, oklch(0.201 0.008 274.503) 0%, oklch(0.173 0.006 271.029) 100%);
}

.dark .auth-brand__logo {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.32), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.dark .auth-card {
  background: color-mix(in srgb, var(--ui-bg-elevated) 82%, transparent);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.32);
}

@keyframes authFadeInUp {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

.state-fade-enter-active,
.state-fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.state-fade-enter-from,
.state-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
