module Atoitoa(atoi, itoa) where
import Data.Char (digitToInt)

radix_K16 = "0123456789ABCDEF"
radix_K10 = take 10 radix_K16
radix_K2  = take 2 radix_K16

-- F**king GHC won't accept (itoa'' rx k0 k 0) branch
itoa'' rx k0 k n
  |n == 0 = []
  |otherwise = let d = (n `mod` k) in
    (rx !! dIdx d) : itoa'' rx k0 (k * k) (n - d)
  where
    lastk = k `div` k0 -- k=1000, lastk=100
    dIdx d = (d `div` lastk)

itoa' radix base = reverse . (itoa'' radix base base)

itoa = itoa' radix_K10 10
itoa_2 = itoa' radix_K2 2
itoa_16 = itoa' radix_K16 16
atoi base = foldl (\ac -> (ac*base +) . digitToInt) 0
