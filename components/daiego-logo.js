const LOGO_LIGHT_SRC = "/logos/daiego-light.svg"
const LOGO_DARK_SRC = "/logos/daiego-dark.svg"

export function DaiegoLogo({
  className = "",
  width = 140,
  height = 100,
  priority = false,
  variant = "auto",
}) {
  const sharedProps = {
    alt: "DAIEGO",
    width,
    height,
    decoding: "async",
    ...(priority ? { fetchPriority: "high" } : {}),
  }

  const imageClassName = `shrink-0 object-contain ${className}`

  if (variant === "dark") {
    return (
      <img
        {...sharedProps}
        src={LOGO_DARK_SRC}
        className={imageClassName}
      />
    )
  }

  if (variant === "light") {
    return (
      <img
        {...sharedProps}
        src={LOGO_LIGHT_SRC}
        className={imageClassName}
      />
    )
  }

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {/* Keep light logo in flow (invisible in dark) so the box retains size */}
      <img
        {...sharedProps}
        src={LOGO_LIGHT_SRC}
        className="h-full w-full object-contain dark:invisible"
      />
      <img
        {...sharedProps}
        src={LOGO_DARK_SRC}
        alt=""
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
        aria-hidden
      />
    </span>
  )
}
