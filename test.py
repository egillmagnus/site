#!/usr/bin/env python3
"""
Interactive converter:
Input: rotation (theta), height (y), and radius (r)
Output: x, y, z

Updated convention:
- y stays y
- rotation = 0 points along the -Z axis
- radius = 0 maps to (x0, z0) = (278, 300)
- angles are in degrees
"""

import math

X0 = 278.0
Z0 = 300.0

def to_xyz(r: float, theta_deg: float, y: float) -> tuple[float, float, float]:
    """
    Convert (r, theta, y) to (x, y, z)
    with theta = 0° along -Z.
    """
    t = math.radians(theta_deg)
    x = X0 + r * math.sin(t)
    z = Z0 - r * math.cos(t)   # minus sign flips +Z to -Z at theta=0
    return x, y, z

def read_float(prompt: str) -> float | None:
    s = input(prompt).strip()
    if s.lower() in {"q", "quit", "exit"}:
        return None
    return float(s)

def main() -> None:
    print("Polar + height → XYZ")
    print("Type q / quit / exit at any prompt to stop.\n")
    print(f"Offsets: x0={X0}, z0={Z0}")
    print("Rotation θ = 0° points along -Z.\n")

    while True:
        try:
            theta = read_float("Rotation (degrees): ")
            if theta is None:
                break

            y = read_float("Height (y): ")
            if y is None:
                break

            r = read_float("Radius (r): ")
            if r is None:
                break

            x, yy, z = to_xyz(r, theta, y)
            print(f"center = {x:.6f}, {y:.6f}, {z:.6f}\n")

        except ValueError:
            print("Please enter a valid number (or q to quit).\n")
        except KeyboardInterrupt:
            print("\nExiting.")
            break

if __name__ == "__main__":
    main()
