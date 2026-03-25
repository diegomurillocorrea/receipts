import Image from "next/image"

const LOGO_SRC = "/DAIEGO.png"

export function DaiegoLogo({
  className = "",
  width = 180,
  height = 54,
  priority = false,
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="DAIEGO"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={priority}
    />
  )
}
