// Google Identity Services (GIS) SDK type declarations.
// Loaded at runtime via <script src="https://accounts.google.com/gsi/client">.

export interface GISCredentialResponse {
  credential: string
  select_by: string
}

export interface GISPromptNotification {
  isDisplayed(): boolean
  isNotDisplayed(): boolean
  getNotDisplayedReason(): string
  isSkippedMoment(): boolean
  getSkippedReason(): string
  isDismissedMoment(): boolean
  getDismissedReason(): string
}

export interface GISButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

export interface GISInitConfig {
  client_id: string
  callback?: (response: GISCredentialResponse) => void
  ux_mode?: 'popup' | 'redirect'
  login_uri?: string
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  context?: 'signin' | 'signup' | 'use'
  itp_support?: boolean
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: GISInitConfig): void
          renderButton(element: HTMLElement, config: GISButtonConfig): void
          prompt(momentListener?: (notification: GISPromptNotification) => void): void
          cancel(): void
          disableAutoSelect(): void
          revoke(hint: string, callback: () => void): void
        }
      }
    }
    onGoogleLibraryLoad?: () => void
  }
}
