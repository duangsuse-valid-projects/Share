module Base64 (b64e, b64d) where

import Data.Char (ord)

type Radix = [Char]
type Nat = Int

radix_64 = ['A'..'Z'] ++ ['a'..'z'] ++ ['0'..'9'] ++ "+/"

itoa' :: Radix -> Nat -> (Int -> String)
itoa' _ _ 0 = []
itoa' rx b n = (rx !! (n `mod` b)) : itoa' rx b (n `div` b)

atoi' :: (Char -> Int) -> Nat -> (String -> Int)
atoi' d2int b ns = foldl (\ac -> (ac*b +) . d2int) 0 ns

b642int = undefined

-- 3:4
b64e = itoa' radix_64 64 
-- 4:3
b64d = atoi' b642int 64

-- 懒得写了

