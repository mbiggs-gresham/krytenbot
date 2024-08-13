export const note = (message: string): string => {
  return `> [!NOTE]\n> ${message}`
}

export const tip = (message: string): string => {
  return `> [!TIP]\n> ${message}`
}

export const important = (message: string): string => {
  return `> [!IMPORTANT]\n> ${message}`
}

export const warning = (message: string): string => {
  return `> [!WARNING]\n> ${message}`
}

export const caution = (message: string): string => {
  return `> [!CAUTION]\n> ${message}`
}

export const hidden = (message: string): string => {
  return `[//]: # (${message})`
}
