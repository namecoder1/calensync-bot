"use client"

import * as React from "react"
import DOMPurify from "isomorphic-dompurify"

export type SafeHtmlProps = {
  html: string
  className?: string
  /**
   * Opzioni DOMPurify opzionali se serve personalizzare il comportamento.
   * Per impostazione predefinita consente i tag e attributi standard sicuri,
   * inclusi i link (<a href=...>). Non abilita lo stile inline.
   */
  sanitizeOptions?: any
}

/**
 * Renderizza HTML sanitizzato in modo sicuro.
 * Usa DOMPurify (compatibile SSR) per prevenire XSS.
 */
export function SafeHtml({ html, className, sanitizeOptions }: SafeHtmlProps) {
  const sanitized = React.useMemo(() => {
    // Consenti alcuni attributi utili per i link senza permettere stile inline.
    // IMPORTANTE: non impostare ALLOWED_TAGS/ALLOWED_ATTR a undefined,
    // lasciamoli semplicemente non presenti per evitare errori interni di DOMPurify.
    const baseOptions = {
      ADD_ATTR: ["target", "rel"],
      FORBID_TAGS: ["style", "script"],
      FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
      ...sanitizeOptions,
    }
    return DOMPurify.sanitize(html, baseOptions)
  }, [html, sanitizeOptions])

  return (
    <div
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

export default SafeHtml
