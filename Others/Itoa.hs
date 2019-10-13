import Test.QuickCheck (quickCheck)
import Data.Char (intToDigit)

itoa'' :: Int -> (Int -> String)
itoa'' b n
  |n == 0 = []
  |otherwise = intToDigit (n `mod` b) : itoa'' b (n `div` b)
itoa' _ 0 = "0"
itoa' base n = let f = reverse . (itoa'' base) . abs in (f n)
fneg toa n = let s = toa n in
  if n < 0 then '-' : s else s

itoa = fneg (itoa' 10)
prop_itoaEquiv i = (itoa i) == (show i)
  where _ = i :: Int
