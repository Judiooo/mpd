export function matchValue<T extends string>(
  text: string,
  patterns: {
    value: T
    regex: RegExp
  }[],
): T | undefined {
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      return pattern.value
    }
  }

  return undefined
}

export function matchBoolean(
  text: string,
  patterns: RegExp[],
): boolean {
  return patterns.some((r) => r.test(text))
}

export function matchNumber(
  text: string,
  patterns: RegExp[],
): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match) {
      return Number(match[1])
    }
  }

  return undefined
}

export function matchTrash(
  text: string,
  patterns: RegExp[],
): boolean {
  return patterns.some((r) => r.test(text))
}