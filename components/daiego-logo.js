const LOGO_LIGHT_SRC = "/logos/daiego-light.svg"
const LOGO_DARK_SRC = "/logos/daiego-dark.svg"

export function DaiegoLogo({
  className = "",
  width = 180,
  height = 54,
  priority = false,
}) {
  const sharedProps = {
    alt: "DAIEGO",
    width,
    height,
    decoding: "async",
    ...(priority ? { fetchPriority: "high" } : {}),
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
