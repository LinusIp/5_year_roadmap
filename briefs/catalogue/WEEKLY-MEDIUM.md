# Weekly medium: coding challenges (112)

## arrays

### Everyone but me
`dc-a-everyone-but-me` · medium · 45 min

For each position i in an array of n integers, compute the product of all the other elements (every element except the one at i). Do not use division, and values may be zero.

**Input.** One line of n integers.  
**Output.** n integers: the product of the others for each position.  
**Constraints.** 2 ≤ n ≤ 10^5; |values| ≤ 10; results fit in 64-bit  
**Example.** `1 2 3 4` → `24 12 8 6` (For 1 the others multiply to 2*3*4=24, and so on.)  
**Example.** `2 0 3` → `0 6 0` (Only the position of the 0 gets a non-zero result (2*3=6).)  
**Hints.** The product of others equals (product to the left) times (product to the right). / Build left products in one pass, then multiply by a running right product in a second pass.  
**Approach.** Fill the output with prefix products (product of everything left of i). Then sweep from the right keeping a running suffix product and multiply it in. (O(n) time, O(1) extra space besides the output)  
**Edge cases.** two zeros; one zero; negative numbers

### Next lock code
`dc-a-next-lock-code` · medium · 45 min

A combination lock shows a sequence of digits. Rearrange them into the next larger arrangement in dictionary (lexicographic) order, using the same multiset of numbers. If the sequence is already the largest possible, wrap around to the smallest arrangement (sorted ascending).

**Input.** One line of n integers.  
**Output.** The next arrangement as n integers.  
**Constraints.** 1 ≤ n ≤ 10^5; values fit in 32-bit  
**Example.** `1 3 2` → `2 1 3` (Pivot 1 swaps with 2, and the tail becomes ascending: 2 1 3.)  
**Example.** `3 2 1` → `1 2 3` (Fully descending is the largest, so wrap to ascending.)  
**Hints.** Find the rightmost position where a[i] < a[i+1]; everything after it is descending. / Swap a[i] with the smallest larger value to its right, then reverse the suffix.  
**Approach.** Scan from the right for the first index i with a[i] < a[i+1]. Swap a[i] with the rightmost element greater than it, then reverse the suffix after i. If no such i exists, just reverse the whole array. (O(n) time, O(1) extra space)  
**Edge cases.** already descending; duplicates present; n = 1

## backtracking

### Peaceful queens
`dc-c-queens-count` · medium · 45 min

Place n queens on an n by n chessboard so that no two attack each other (no shared row, column or diagonal). Count the number of different valid placements.

**Input.** One integer n.  
**Output.** One integer: the number of placements.  
**Constraints.** 1 ≤ n ≤ 9  
**Example.** `4` → `2` (Exactly two solutions exist.)  
**Example.** `1` → `1` (One queen on a 1x1 board.)  
**Hints.** Place one queen per row, choosing a column. / Track used columns and both diagonals (r-c and r+c) for O(1) checks.  
**Approach.** Row-by-row backtracking with sets for columns and the two diagonal directions. Place, recurse, and undo; count placements that fill all rows. (Roughly O(n!) worst case, O(n) space)  
**Edge cases.** n = 1; n = 2 or 3 (zero solutions); n = 9

### Find the word trail
`dc-c-word-trail` · medium · 45 min

A letter grid and a target word are given. Decide whether the word can be spelled by starting at any cell and stepping to horizontally or vertically adjacent cells, never using the same cell twice in one path.

**Input.** First line R C, then R grid rows, then the word.  
**Output.** YES if the word can be traced, otherwise NO.  
**Constraints.** 1 ≤ R, C ≤ 6; word length ≤ 12  
**Example.** `3 3
abc
sfe
adc
sad` → `YES` (s at (2,1), a at (3,1), d at (3,2) spells sad.)  
**Example.** `2 2
aa
aa
aaaaa` → `NO` (Only four cells exist, five letters need five distinct cells.)  
**Hints.** Try every cell as a starting point. / Mark the current cell as used and unmark it when you backtrack.  
**Approach.** For each cell matching the first letter run DFS matching successive letters across unused neighbors; fail fast on mismatch, undo marks on return. (O(R·C·3^L) worst case, O(L) stack)  
**Edge cases.** Word longer than the grid; Single-letter word; Word that needs to reuse a cell

### Cut into palindromes
`dc-c-palindrome-cuts` · medium · 45 min

Count the ways to cut a lowercase string into consecutive pieces so that every piece is a palindrome. Cuts at different positions count as different ways, even if the resulting pieces look the same.

**Input.** One lowercase string.  
**Output.** One integer: the number of ways.  
**Constraints.** 1 ≤ length ≤ 16  
**Example.** `aab` → `2` (a|a|b and aa|b.)  
**Example.** `aaa` → `4` (a|a|a, a|aa, aa|a, aaa.)  
**Hints.** Choose where the first piece ends, then solve the remainder. / Only continue when the chosen prefix is a palindrome.  
**Approach.** Backtrack from index i: for each end j where w[i..j] is a palindrome, recurse at j+1. Reaching the end counts one way. Memoizing on i speeds it up. (O(2^n · n) worst case (O(n²) with memo and precomputed palindromes))  
**Edge cases.** Single character; All identical letters (2^(n-1) ways); No long palindromes

## binary-search

### Search the spun dial
`dc-a-spun-dial-search` · medium · 45 min

A sorted list of distinct numbers was rotated at an unknown point (for example 1 2 3 4 5 became 4 5 1 2 3). Find the index of a target value in the rotated list, or -1, using binary search.

**Input.** Line 1: the rotated list; line 2: the target.  
**Output.** An index or -1.  
**Constraints.** 1 ≤ n ≤ 10^5; values distinct  
**Example.** `6 7 1 2 3 4 5
3` → `4` (3 is at index 4.)  
**Example.** `6 7 1 2
8` → `-1` (8 is not in the list.)  
**Hints.** At every midpoint, at least one half is sorted. / Check whether the target lies inside the sorted half; if so go there, else go to the other half.  
**Approach.** In each step compare a[lo] and a[mid] to determine which half is sorted, test whether the target falls in that half's range, and discard the other half accordingly. (O(log n) time, O(1) space)  
**Edge cases.** not rotated; target at the ends; n = 1

### Slowest robot speed
`dc-a-slowest-robot-speed` · medium · 45 min

A robot vacuum must clean several rooms with the given sizes. At speed s it cleans s units per hour and works on one room at a time; a room takes ceil(size / s) whole hours (it never starts a second room within the same hour). Find the smallest integer speed that finishes all rooms within h hours.

**Input.** Line 1: room sizes; line 2: hours h (at least the number of rooms).  
**Output.** One integer speed.  
**Constraints.** 1 ≤ rooms ≤ 10^5; sizes ≤ 10^9; rooms ≤ h ≤ 10^9  
**Example.** `5 9 14
6` → `5` (At speed 5: 1+2+3 = 6 hours; at speed 4 it needs 9.)  
**Example.** `10
1` → `10` (One room of 10 in 1 hour needs speed 10.)  
**Hints.** More speed never takes more time, so the feasibility is monotone. / Binary search the speed from 1 to the largest room size.  
**Approach.** Binary search the speed between 1 and max(size). For a candidate, compute total hours as the sum of ceil(size/speed); if it is ≤ h shrink the upper bound, else raise the lower bound. (O(n log max) time, O(1) space)  
**Edge cases.** h equals number of rooms; h very large; single room

### Split the shipment
`dc-a-split-the-shipment` · medium · 45 min

Packages with the given weights must be shipped in the given order over d days; each day's truck carries a consecutive group and has the same capacity. Find the smallest truck capacity that gets everything shipped within d days.

**Input.** Line 1: package weights in order; line 2: d.  
**Output.** One integer.  
**Constraints.** 1 ≤ d ≤ n ≤ 10^5; weights ≤ 10^4  
**Example.** `4 8 2 6 3
3` → `10` (Groups [4], [8,2], [6,3] have loads 4, 10, 9.)  
**Example.** `5 5 5
3` → `5` (Each day takes one package.)  
**Hints.** The capacity is at least the heaviest package and at most the total. / For a candidate capacity, greedily pack days and count them.  
**Approach.** Binary search the capacity between max(weights) and sum(weights). Feasibility check: walk through packages, starting a new day when the current load would exceed the capacity, and test that the days used ≤ d. (O(n log(sum)) time, O(1) space)  
**Edge cases.** d = 1; d = n; single heavy package

### Missing seat numbers
`dc-a-missing-seat-numbers` · medium · 45 min

Seats are numbered 1, 2, 3, ... forever, but a sorted list of distinct seat numbers is already taken. Print the k-th smallest seat number that is still free.

**Input.** Line 1: sorted taken seats; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ k ≤ 10^9  
**Example.** `1 4 5 9
3` → `6` (Free seats are 2, 3, 6, 7, 8 and the third is 6.)  
**Example.** `5 6
2` → `2` (Free seats start 1, 2, ... so the 2nd is 2.)  
**Hints.** At index i, the count of free seats below a[i] is a[i] - (i+1). / Find how many taken seats are below the answer by binary searching on that count.  
**Approach.** Binary search the first index where a[i] - (i+1) ≥ k. If that index is lo, then exactly lo taken seats lie below the answer and it equals lo + k. (O(log n) time, O(1) space)  
**Edge cases.** k beyond the last taken seat; first seat free; n = 1

## bits

### Two missing exits
`dc-d-two-lonely-badges` · medium · 45 min

In an access log every badge id appears twice (entry and exit) except exactly two different badges that appear only once. Find both ids and print them in increasing order. Aim for one pass and constant extra memory.

**Input.** First line n (even), second line n ids.  
**Output.** The two unpaired ids, smaller first, separated by a space.  
**Constraints.** 2 ≤ n ≤ 10^5; ids fit in 32 bits and the two odd ones are distinct  
**Example.** `6
4 1 2 1 2 9` → `4 9` (4 and 9 have no partner)  
**Example.** `4
5 8 5 3` → `3 8` (8 and 3 are single)  
**Hints.** XOR of everything equals a XOR b where a and b are the two answers. It is nonzero, so some bit differs between them. / Use any set bit of that XOR to split the array into two groups, each containing one answer plus pairs.  
**Approach.** XOR everything to get a^b, isolate its lowest set bit, partition values by that bit, and XOR each group separately. (O(n) time, O(1) extra space)  
**Edge cases.** n = 2; Answers differ only in the top bit; One answer is 0

### The odd one of triplets
`dc-d-lonely-of-three` · medium · 45 min

A sensor sends each reading three times, except one reading which was sent only once. Find the reading that was sent once. Plain XOR will not cancel triples, so think about counting bits.

**Input.** First line n (n mod 3 = 1), second line n non-negative integers.  
**Output.** The reading that appears once.  
**Constraints.** 1 ≤ n ≤ 10^5; values < 2^31  
**Example.** `7
6 6 1 9 6 1 1` → `9` (9 appears once, 6 and 1 appear three times)  
**Example.** `4
8 8 2 8` → `2` (2 is the single one)  
**Hints.** For each bit position, count how many numbers have that bit set. / That count mod 3 is the bit of the answer.  
**Approach.** For each of 32 bit positions, sum the bits across all numbers modulo 3; bits with remainder 1 belong to the unique number. (O(32 n) time, O(1) space)  
**Edge cases.** n = 1; Unique number is 0; Values using the highest bit

### Most different pair
`dc-d-max-xor-pair` · medium · 45 min

Each of n players has a skill signature, a non-negative integer. A pairing is exciting in proportion to the XOR of the two signatures. Find the maximum XOR over all pairs of distinct players (two players may have equal signatures).

**Input.** First line n, second line n integers.  
**Output.** The maximum XOR of two elements at different positions.  
**Constraints.** 2 ≤ n ≤ 10^5; values < 2^30  
**Example.** `4
3 10 5 25` → `28` (5 XOR 25 = 28)  
**Example.** `2
6 6` → `0` (equal values give 0)  
**Hints.** A brute force over pairs is O(n^2); decide the answer bit by bit from the top instead. / Store prefixes of numbers in a trie (or a set per bit level) and greedily look for the opposite bit.  
**Approach.** Insert each number into a binary trie; for every number walk the trie preferring the opposite bit at each level and track the best XOR found. (O(30 n) time, O(30 n) space)  
**Edge cases.** n = 2; All values equal; One value is 0

### Next pattern, same brightness
`dc-d-next-same-lights` · medium · 45 min

A light strip shows a pattern stored in an integer; its brightness is the number of 1 bits. Find the smallest integer strictly larger than n that has the same number of 1 bits.

**Input.** One positive integer n.  
**Output.** The next larger integer with equal popcount.  
**Constraints.** 1 ≤ n ≤ 2^40  
**Example.** `6` → `9` (110 -> 1001 = 9)  
**Example.** `1` → `2` (1 -> 10 = 2)  
**Hints.** Find the rightmost block of ones; you must move one 1 up past a zero. / After moving it, push the remaining ones of the block as far right as possible.  
**Approach.** Let c = n & -n and r = n + c (which carries the lowest block up); the answer is r | (((n ^ r) / c) >> 2). Equivalently, find the rightmost '01', swap it to '10', and right-justify the ones below. (O(1) time and space)  
**Edge cases.** n = 1; n is a power of two; n = 2^k - 1

## bst

### Honest search tree
`dc-b-honest-search-tree` · medium · 45 min

A binary tree claims to be a binary search tree: for every node, all values in its left subtree must be strictly smaller and all values in its right subtree strictly larger. Check the claim for the given tree; remember the rule applies to whole subtrees, not just direct children.

**Input.** One line giving a binary tree in level-order, with null for missing children.  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^4; values distinct  
**Example.** `5 3 8 1 4 7 9` → `true` (Every node respects the bounds set by its ancestors.)  
**Example.** `5 3 8 1 6` → `false` (6 is the right child of 3, which is fine locally, but it sits in 5's left subtree and is larger than 5.)  
**Hints.** Checking only parent-child pairs is not enough. / Pass an allowed (low, high) range down the recursion; going left tightens high, going right tightens low.  
**Approach.** DFS with exclusive lower and upper bounds. A node must lie strictly within the bounds; its left child gets (low, node) and its right child gets (node, high). Alternatively check that an in-order traversal is strictly increasing. (O(n) time, O(h) space)  
**Edge cases.** Single node; Violation deep in a subtree; Values at extremes of the int range

### Balanced from sorted
`dc-b-balanced-from-sorted` · medium · 45 min

Turn a sorted array of distinct integers into a height-balanced BST: choose the middle element as the root of each range, using the lower middle when the range has an even length, and build the subtrees from the two halves. Print the tree's pre-order traversal (root, left, right).

**Input.** One line of strictly increasing integers.  
**Output.** The pre-order traversal.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 5` → `3 1 2 4 5` (Root 3; left half [1 2] has lower middle 1 with right child 2; right half [4 5] has root 4 and right child 5: 3 1 2 4 5.)  
**Example.** `1 2 3 4` → `2 1 3 4` (Lower middle of 4 elements is 2; left [1]; right [3 4] gives root 3 then 4: 2 1 3 4.)  
**Hints.** Each range of the array maps to one subtree. / Recurse on (lo, hi): mid = (lo+hi)//2, node = a[mid], children from (lo, mid-1) and (mid+1, hi).  
**Approach.** Recursively pick the lower middle of the current range as the node, build the left subtree from the elements before it and the right from the elements after it. Output the pre-order of the result. (O(n) time, O(log n) recursion depth)  
**Edge cases.** Single element; Two elements; Large input

### Pair in the search tree
`dc-b-pair-in-search-tree` · medium · 45 min

Given the values of a BST (as an insertion order) and a target number, decide whether two different nodes exist whose values add up to the target. Avoid checking every pair.

**Input.** Line 1: insertion order. Line 2: the target.  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `5 3 6 2 4 7
9` → `true` (3 + 6 = 9.)  
**Example.** `5 3 6 2 4 7
28` → `false` (The two largest values add to 13, so no pair reaches 28.)  
**Hints.** An in-order walk gives a sorted list. / Collect the in-order values then use two pointers from both ends; or use a hash set during traversal.  
**Approach.** Traverse in-order to get a sorted array and run the two-pointer technique, moving the left pointer up when the sum is too small and the right pointer down when too large. A hash set during DFS also works. (O(n) time, O(n) space)  
**Edge cases.** Single node; Target uses the same node twice; Negative values

### Remove from the search tree
`dc-b-remove-from-search-tree` · medium · 45 min

Insert values into a BST, then delete one value if it is present. When the removed node has two children, replace its value with the smallest value of its right subtree and remove that node instead. Print the pre-order traversal of the final tree (root, left, right), or EMPTY.

**Input.** Line 1: insertion order. Line 2: the value to delete.  
**Output.** The pre-order traversal after deletion.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `50 30 70 20 40 60 80
50` → `60 30 20 40 70 80` (The root is replaced by its successor 60: 60 30 20 40 70 80.)  
**Example.** `8 3 10 1 6
3` → `8 6 1 10` (3 has two children; its successor is 6, which takes its place: 8 6 1 10.)  
**Hints.** Handle three cases: no child, one child, two children. / For two children copy the in-order successor's value into the node and delete the successor from the right subtree.  
**Approach.** Recursively search for the value. A node with at most one child is replaced by that child. For two children, find the minimum in the right subtree, copy it up, and delete it from the right subtree. (O(h) time, O(h) recursion space)  
**Edge cases.** Delete a leaf; Delete a node with one child; Value not present

## design

### Least-recently-used cache
`dc-b-least-recent-cache` · medium · 45 min

Design a cache with a fixed capacity that stores integer key-value pairs. get k returns the value or -1 and counts as a use; put k v inserts or updates a key (also a use), and when the cache would exceed its capacity the key that was used least recently is evicted. Both operations should run in O(1) time. Simulate a list of commands and print the results of the get commands.

**Input.** Line 1: capacity. Line 2: commands separated by semicolons, like 'put 1 10;get 1'.  
**Output.** The results of the get commands, space-separated.  
**Constraints.** 1 ≤ capacity ≤ 10^4; up to 10^5 commands  
**Example.** `2
put 1 10;put 2 20;get 1;put 3 30;get 2;get 3` → `10 -1 30` (get 1 gives 10 and refreshes key 1, so put 3 evicts key 2: 10 -1 30.)  
**Example.** `1
put 1 1;put 2 2;get 1;get 2;put 2 5;get 2` → `-1 2 5` (Capacity 1: putting 2 evicts 1, then updating key 2 to 5 gives -1 2 5.)  
**Hints.** You need to find a key quickly and also know which key is the oldest in use. / Combine a hash map with a doubly linked list ordered by recency; move a node to the front on every use and remove from the tail on overflow.  
**Approach.** Store key to list node in a hash map, and keep the nodes in a doubly linked list from most to least recently used. get and put move the node to the front; when size exceeds capacity remove the tail node and its map entry. (O(1) per operation, O(capacity) space)  
**Edge cases.** Updating an existing key; Capacity 1; get of a missing key

### Time-travel notebook
`dc-b-time-travel-notes` · medium · 45 min

Design a key-value store that remembers every value a key ever had. set key value time stores a value at a timestamp (timestamps for the same key are increasing), and get key time returns the value with the largest timestamp not exceeding time, or none if the key had no value by then. Print the result of every get.

**Input.** One line of commands separated by semicolons; keys and values are lowercase-or-digit words.  
**Output.** The results of get commands, space-separated.  
**Constraints.** up to 10^5 commands; timestamps up to 10^9  
**Example.** `set a x 1;set a y 4;get a 3;get a 4;get a 0;get b 1` → `x y none none` (At time 3 the latest value is x; at 4 it is y; at 0 nothing existed yet; key b was never set: x y none none.)  
**Example.** `set k v1 10;set k v2 20;get k 15;get k 25;get k 20` → `v1 v2 v2` (Time 15 sees v1, time 25 sees v2, time 20 is exactly v2: v1 v2 v2.)  
**Hints.** For each key the stored timestamps are sorted. / Keep a list of (time, value) per key and binary search for the last time ≤ query.  
**Approach.** Map each key to a list of (timestamp, value) pairs appended in increasing order. For get, binary search for the rightmost timestamp ≤ the query and return its value, or none if there is no such entry. (O(1) per set, O(log m) per get)  
**Edge cases.** Query before the first timestamp; Unknown key; Exact timestamp match

### Versioned array
`dc-b-versioned-array` · medium · 45 min

Design an array of n integers, all starting at 0, that can take snapshots. set i v changes one cell, snap saves the current contents and returns the snapshot id (0, 1, 2, ...), and get i id returns what cell i held when snapshot id was taken. Print the result of every snap and get.

**Input.** Line 1: n. Line 2: commands separated by semicolons.  
**Output.** One number per snap or get command, space-separated.  
**Constraints.** 1 ≤ n ≤ 10^5; up to 5*10^4 commands  
**Example.** `3
set 0 5;snap;set 0 6;get 0 0;snap;get 0 1;get 1 1` → `0 5 1 6 0` (First snap is id 0; the cell was 5 then. The second snap is id 1 with cell 0 equal to 6, cell 1 still 0: 0 5 1 6 0.)  
**Example.** `2
snap;set 1 9;snap;get 1 0;get 1 1` → `0 1 0 9` (Snapshot 0 saw 0 in cell 1, snapshot 1 saw 9: 0 1 0 9.)  
**Hints.** Copying the whole array on every snapshot is too slow and memory hungry. / Store for each index a list of (snapshotId, value) changes and binary search at get time.  
**Approach.** Per index keep a list of (snap id, value) entries, appended only when a cell changes. On get, binary search the last entry whose snap id is ≤ the requested id, defaulting to 0. (O(1) set/snap, O(log changes) get)  
**Edge cases.** get before any set; Several sets between snaps; Snapshot id equal to the latest

## dp

### Longest rising subsequence
`dc-c-rising-run` · medium · 45 min

From a list of n integers, pick some of them, keeping their original order, so that each chosen number is strictly larger than the previous one. Find the largest number of integers you can pick.

**Input.** First line n; second line n integers.  
**Output.** One integer: the length of the longest strictly increasing subsequence.  
**Constraints.** 1 ≤ n ≤ 10^5; |a[i]| ≤ 10^9  
**Example.** `6
10 9 2 5 3 7` → `3` (2, 3, 7 (or 2, 5, 7) has length 3 and nothing is longer.)  
**Example.** `4
4 4 4 4` → `1` (Equal values are not strictly increasing.)  
**Hints.** O(n²): len[i] = 1 + max len[j] for earlier smaller a[j]. / For O(n log n) keep tails[k] = smallest ending value of an increasing subsequence of length k+1.  
**Approach.** Maintain a sorted tails array; for each value binary-search the first tail >= value and replace it, or append if none. The array length is the answer. (O(n log n) time, O(n) space)  
**Edge cases.** Strictly decreasing; All equal; Already sorted

### Ways to pay exactly
`dc-c-pay-combinations` · medium · 45 min

Given n coin values, each available without limit, count the number of different multisets of coins that sum to exactly T (order does not matter: 1+2 and 2+1 are the same). Print the count modulo 1 000 000 007.

**Input.** First line n T; second line n distinct positive coin values.  
**Output.** One integer: the number of combinations modulo 1 000 000 007.  
**Constraints.** 1 ≤ n ≤ 50; 0 ≤ T ≤ 10^4  
**Example.** `3 5
1 2 5` → `4` (5; 2+2+1; 2+1+1+1; 1×5: 4 ways.)  
**Example.** `1 3
2` → `0` (Cannot make 3 from 2s.)  
**Hints.** Counting orders instead of combinations happens when the loops are swapped. / Process one coin value at a time in the outer loop.  
**Approach.** dp[0] = 1; for each coin value x, for amounts from x to T, dp[a] += dp[a-x]. The coin-outer loop counts each multiset once. (O(n · T) time, O(T) space)  
**Edge cases.** T = 0 (one way); Impossible total; Coin larger than T

### Longest shared thread
`dc-c-shared-thread` · medium · 45 min

Two strings are given. A shared thread is a sequence of letters that appears in both strings in the same order, though not necessarily contiguously. Find the length of the longest shared thread.

**Input.** Two lines, each a lowercase string.  
**Output.** One integer: the length of the longest common subsequence.  
**Constraints.** 1 ≤ length ≤ 2000  
**Example.** `abcde
ace` → `3` (a, c, e appear in order in both.)  
**Example.** `abc
def` → `0` (No letters in common.)  
**Hints.** Define L[i][j] for the first i letters of one string and first j of the other. / If the last letters match, extend L[i-1][j-1]; otherwise take the better of dropping one letter.  
**Approach.** Fill a 2D table: L[i][j] = L[i-1][j-1] + 1 if a[i-1] = b[j-1], else max(L[i-1][j], L[i][j-1]). The corner holds the answer. (O(n·m) time, O(min(n,m)) space with rolling rows)  
**Edge cases.** No common letter; Identical strings; One string much shorter

## graphs

### Is there a loop in the wiring
`dc-c-loop-in-wires` · medium · 45 min

An electrician has n junctions connected by m wires. A loop exists if you can leave a junction, travel along distinct wires, and come back to where you started. Two wires between the same pair of junctions already form a loop. Report whether any loop exists.

**Input.** First line n m, followed by m lines each with a wire u v.  
**Output.** YES if a loop exists, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; u may equal v  
**Example.** `4 3
1 2
2 3
3 4` → `NO` (A chain has no loop.)  
**Example.** `3 3
1 2
2 3
3 1` → `YES` (The triangle returns to its start.)  
**Hints.** In a forest, joining two nodes that are already connected would create a loop. / Union-find tells you instantly whether two endpoints share a component.  
**Approach.** Process wires with union-find; if an edge joins two nodes already in the same set, a loop exists. Self-loops and parallel wires are caught the same way. (O(m α(n)) time, O(n) space)  
**Edge cases.** Self-loop wire; Two parallel wires; Disconnected pieces where only one has a loop

### Can the course plan work
`dc-c-course-plan` · medium · 45 min

A degree has n courses, and a line a b means course a must be finished before course b can start. You can take any number of courses in a semester as long as prerequisites are done in earlier semesters. Decide whether it is possible to complete all courses.

**Input.** First line n m, followed by m lines each with a prerequisite pair a b.  
**Output.** YES if all courses can be completed, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `4 3
1 2
2 3
1 4` → `YES` (Take 1, then 2 and 4, then 3.)  
**Example.** `3 3
1 2
2 3
3 1` → `NO` (Each course waits on another in a circle.)  
**Hints.** A course with no unfinished prerequisites can be taken now. / Repeatedly remove such courses; if you get stuck with some left, there is a cycle.  
**Approach.** Use Kahn's algorithm: keep in-degrees, queue zero in-degree courses, and decrement neighbors as courses are taken. If the number taken equals n the plan works. (O(n + m) time, O(n + m) space)  
**Edge cases.** No prerequisites; Self-prerequisite a a; Long cycle hidden behind free courses

### Split into two teams
`dc-c-two-teams` · medium · 45 min

A coach has n players and m pairs who cannot stand each other. The players must be split into two teams so that no rival pair ends up on the same team. Decide whether such a split exists.

**Input.** First line n m, followed by m lines each with a rival pair u v.  
**Output.** YES if a valid split exists, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `4 4
1 2
2 3
3 4
4 1` → `YES` (Teams {1,3} and {2,4} work.)  
**Example.** `3 3
1 2
2 3
3 1` → `NO` (A triangle forces two rivals together.)  
**Hints.** Give a start node team 1; its rivals must be team 2, and their rivals team 1. / If a node is ever forced onto both teams, the answer is NO. Remember to start a fresh search in every component.  
**Approach.** Two-color the graph with BFS from each uncolored node. Hitting an edge whose endpoints share a color means an odd cycle, so NO. (O(n + m) time, O(n + m) space)  
**Edge cases.** Disconnected components; Isolated players; Odd cycle in one far component

### Smallest valid task order
`dc-c-smallest-order` · medium · 45 min

There are n tasks, and a line a b means task a must come before task b. Among all orders that respect every rule, print the one that is smallest when compared position by position (first number as small as possible, then second, and so on). If no valid order exists print IMPOSSIBLE.

**Input.** First line n m, followed by m lines each with a rule a b.  
**Output.** The n task numbers separated by spaces, or IMPOSSIBLE.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `4 2
3 1
4 2` → `3 1 4 2` (Start with 3 (smallest free), then 1, 4, 2.)  
**Example.** `2 2
1 2
2 1` → `IMPOSSIBLE` (Circular rules, nothing is valid.)  
**Hints.** A plain queue gives a valid order but not necessarily the smallest. / Among all tasks currently free, always take the smallest number.  
**Approach.** Run Kahn's algorithm with a min-heap of zero in-degree nodes. Greedy smallest-first is optimal for lexicographic order; if fewer than n nodes are output there is a cycle. (O((n + m) log n) time, O(n + m) space)  
**Edge cases.** Cycle; No rules (answer is 1..n); Large number first forced by rule

### Cheapest delivery route
`dc-c-cheapest-route` · medium · 45 min

A courier moves between n depots along m two-way roads, each with a positive toll. Find the smallest total toll to travel from depot a to depot b, or report that no route exists.

**Input.** First line n m a b, followed by m lines each with a road u v w.  
**Output.** The minimum total toll, or -1 if b is unreachable.  
**Constraints.** 2 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; 1 ≤ w ≤ 10^4  
**Example.** `4 4 1 4
1 2 1
2 4 10
1 3 4
3 4 2` → `6` (Via 3 costs 4+2=6, via 2 costs 11.)  
**Example.** `3 1 1 3
1 2 5` → `-1` (Depot 3 has no roads.)  
**Hints.** BFS fails because edges have different costs. / Use a priority queue keyed by best known distance and skip stale entries.  
**Approach.** Dijkstra's algorithm: pop the closest unsettled depot, relax its roads, and push improvements. Stop or finish and read the distance of b. (O((n + m) log n) time, O(n + m) space)  
**Edge cases.** Unreachable target; Direct road is more expensive than a detour; Parallel roads with different tolls

### Longest dependency chain
`dc-c-longest-chain` · medium · 45 min

A build system has n modules and m dependencies a b meaning a must be built before b; the dependencies contain no cycles. A chain is a sequence of modules where each one directly depends on the previous. Find how many modules the longest chain contains.

**Input.** First line n m, followed by m lines each with a dependency a b.  
**Output.** One integer: the number of modules on the longest chain.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; graph is acyclic  
**Example.** `5 5
1 2
2 3
1 3
3 4
5 4` → `4` (Chain 1-2-3-4 has four modules.)  
**Example.** `3 0` → `1` (No dependencies, so every chain has length 1.)  
**Hints.** Compute for every module the longest chain ending at it. / Process modules in topological order so predecessors are final first.  
**Approach.** Run Kahn's algorithm keeping len[v] = max(len[v], len[u]+1) while relaxing edges; initialize every len to 1. The answer is the maximum len. (O(n + m) time, O(n + m) space)  
**Edge cases.** No edges; Single long path; Several roots joining into one node

## greedy

### Fewest arrows
`dc-c-fewest-arrows` · medium · 45 min

Balloons are stuck on a wall, each covering a horizontal range [a, b]. An arrow shot straight up at position x bursts every balloon whose range contains x (borders included). Find the smallest number of arrows that burst all balloons.

**Input.** First line n; then n lines each with a b.  
**Output.** One integer: the minimum number of arrows.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ a ≤ b ≤ 10^9  
**Example.** `4
1 6
2 8
7 12
10 16` → `2` (An arrow at 6 bursts the first two, an arrow at 12 the last two.)  
**Example.** `3
1 2
3 4
5 6` → `3` (Disjoint ranges need one arrow each.)  
**Hints.** Sort by right end. / Shoot at the right end of the first unburst balloon.  
**Approach.** Sort balloons by right edge. Place an arrow at the current right edge, skip all balloons whose left edge is within it, and start a new arrow at the next uncovered balloon. (O(n log n) time, O(1) extra space)  
**Edge cases.** Touching ranges share an arrow; Nested ranges; Single balloon

### Where to start the loop
`dc-c-fuel-loop` · medium · 45 min

A circular road has n fuel stops. Stop i provides g[i] liters, and driving from stop i to the next costs c[i] liters. Starting with an empty tank at some stop, you must drive once around the whole circle in order. Print the 0-indexed starting stop that works, or -1. Inputs are chosen so that at most one start works.

**Input.** First line n; second line n values g; third line n values c.  
**Output.** The starting index, or -1.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ g[i], c[i] ≤ 10^4  
**Example.** `5
1 2 3 4 5
3 4 5 1 2` → `3` (Starting at stop 3 never lets the tank go negative.)  
**Example.** `3
2 3 4
3 4 3` → `-1` (Total fuel 9 is less than total cost 10.)  
**Hints.** If total fuel is less than total cost, no start works. / If the tank fails between start s and stop j, no stop in between can be a valid start either.  
**Approach.** Track the running tank; when it goes negative, reset the candidate start to the next stop and the tank to zero. If total gas >= total cost the final candidate is the answer. (O(n) time, O(1) space)  
**Edge cases.** n = 1; Total fuel exactly equals total cost; Valid start at index 0

### Glue numbers into the largest
`dc-c-glue-largest` · medium · 45 min

Given n non-negative integers, write them one after another in some order to form one long number. Print the arrangement that gives the largest possible value, with no leading zeros unless the whole number is zero.

**Input.** First line n; second line n integers.  
**Output.** The largest number as a string of digits.  
**Constraints.** 1 ≤ n ≤ 10^5; each ≤ 10^9  
**Example.** `4
3 30 34 5` → `534330` (5 34 3 30 gives 534330.)  
**Example.** `2
0 0` → `0` (Both zeros give just 0.)  
**Hints.** Sorting numerically or lexicographically alone fails (3 vs 30). / Compare two strings a and b by whether a+b beats b+a.  
**Approach.** Convert to strings and sort with the comparator a+b > b+a descending, then join. If the first character is 0 the result is 0. (O(n log n · L) time, O(n L) space)  
**Edge cases.** All zeros; Numbers that are prefixes of each other; Single number

### Drop digits to shrink the number
`dc-c-drop-digits` · medium · 45 min

You are given a number as a digit string and a count k. Delete exactly k digits, keeping the remaining ones in order, so that the resulting number is as small as possible. Ignore leading zeros in the result, and print 0 if nothing remains.

**Input.** First line the digit string; second line k.  
**Output.** The smallest resulting number without leading zeros.  
**Constraints.** 1 ≤ length ≤ 10^5; 0 ≤ k ≤ length  
**Example.** `1432219
3` → `1219` (Remove 4, 3, 2 to get 1219.)  
**Example.** `10200
1` → `200` (Remove the 1 to get 0200, which is 200.)  
**Hints.** A bigger digit followed by a smaller one is a good deletion. / Use a stack: pop while the top is larger than the incoming digit and deletions remain.  
**Approach.** Scan digits with a monotonic stack, popping larger tops while k > 0. Trim any leftover k from the end, strip leading zeros, and return 0 for an empty result. (O(n) time, O(n) space)  
**Edge cases.** k equals length; Leading zeros after deletion; Increasing digits (delete from the end)

### Sections without shared letters
`dc-c-label-sections` · medium · 45 min

Cut a lowercase string into as many consecutive sections as possible so that no letter appears in more than one section. Print the length of each section in order.

**Input.** One lowercase string.  
**Output.** The section lengths separated by spaces.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `abacdcxyx` → `3 3 3` (Sections are aba, cdc and xyx.)  
**Example.** `aaaa` → `4` (One section holds the only letter.)  
**Hints.** Record the last position of each letter. / Extend the current section's end to cover the last occurrence of every letter inside it.  
**Approach.** Precompute last occurrences. Scan, keeping the furthest last-occurrence seen; when the index equals that end, close a section. (O(n) time, O(1) space (26 letters))  
**Edge cases.** All distinct letters; One letter repeated; Letter spanning almost the whole string

## grids

### Spreading mold
`dc-c-spreading-mold` · medium · 45 min

A pantry shelf grid has M for moldy bread, F for fresh bread and . for empty spots. Each minute, every fresh bread orthogonally next to moldy bread becomes moldy. Find how many minutes until no fresh bread remains, 0 if none to begin with, or -1 if some fresh bread can never be reached.

**Input.** First line R C, then R lines of C characters.  
**Output.** The number of minutes, or -1.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `2 3
MF.
FF.` → `2` (Minute 1 spoils two slices, minute 2 spoils the last.)  
**Example.** `1 3
M.F` → `-1` (The gap blocks the spread, so -1.)  
**Hints.** All mold spreads at the same time, so start from every M together. / BFS layers correspond to minutes.  
**Approach.** Multi-source BFS from all M cells, tracking the minute at which each F is infected; count remaining F's at the end. Return the last minute, or -1 if any F remains. (O(R·C) time, O(R·C) space)  
**Edge cases.** No fresh bread; Fresh bread behind empty cells; No mold but fresh bread present

### Landlocked land
`dc-c-landlocked-cells` · medium · 45 min

On a map # is land and . is sea. A land cell is landlocked if you cannot walk from it, moving only over land in four directions, to a land cell on the edge of the map. Count the landlocked land cells.

**Input.** First line R C, then R lines of C characters.  
**Output.** One integer: the number of landlocked land cells.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `4 4
#...
.##.
.##.
#..#` → `4` (The 2x2 block in the middle never touches an edge cell via land.)  
**Example.** `3 3
###
###
###` → `0` (Every cell connects to the border.)  
**Hints.** It is easier to find cells that can escape than cells that cannot. / Start a flood fill from all border land cells and count the leftovers.  
**Approach.** Seed DFS/BFS with every border # cell, marking all land reachable from them. Subtract the marked count from the total land count. (O(R·C) time, O(R·C) space)  
**Edge cases.** No land; Land only on the border; Landlocked cell touching border diagonally only

### Knight hops
`dc-c-knight-hops` · medium · 45 min

A knight stands on an n by n chessboard and moves in the usual L-shape: two cells in one direction and one cell perpendicular. Find the minimum number of moves from a start square to a target square, or -1 if the knight cannot get there.

**Input.** First line n, second line r1 c1 r2 c2 with 1-indexed start and target.  
**Output.** The minimum number of moves, or -1.  
**Constraints.** 1 ≤ n ≤ 300  
**Example.** `8
1 1 2 3` → `1` (One L-shaped move from (1,1) reaches (2,3).)  
**Example.** `3
2 2 1 1` → `-1` (The center of a 3x3 board is cut off from every other square.)  
**Hints.** Squares are nodes and each of the up to eight knight moves is an edge. / BFS from the start gives the shortest move count.  
**Approach.** BFS over board squares using the eight knight offsets with bounds checks. Return the recorded distance of the target when reached, else -1. (O(n²) time, O(n²) space)  
**Edge cases.** Start equals target (0); Tiny board where target is unreachable; Opposite corners of a large board

### Distance to the nearest well
`dc-c-nearest-well` · medium · 45 min

A village grid contains wells marked 0 and houses marked 1. Walking moves one cell up, down, left or right, and you may pass through any cell. For every cell, print the number of steps to the nearest well. At least one well exists.

**Input.** First line R C, then R lines of C characters 0 or 1 with no spaces.  
**Output.** R lines of C space-separated distances.  
**Constraints.** 1 ≤ R, C ≤ 500; at least one 0  
**Example.** `2 3
100
111` → `1 0 0
2 1 1` (Distances grow by one per step away from the wells at (1,2),(1,3).)  
**Example.** `1 4
0110` → `0 1 1 0` (Middle houses are one step from a well.)  
**Hints.** Running a BFS from every house separately is far too slow. / Put all wells in the queue at distance 0 and run one BFS.  
**Approach.** Multi-source BFS: enqueue every 0 cell with distance 0, then expand to 4-neighbors, assigning distance+1 the first time a cell is reached. (O(R·C) time, O(R·C) space)  
**Edge cases.** All wells; One well in a corner; Single row

## hashing

### Stretches with an exact total
`dc-a-exact-total-stretches` · medium · 45 min

Count the number of consecutive stretches (non-empty subarrays) of an integer array whose elements add up to exactly k. Values may be negative or zero, so a simple sliding window will not work.

**Input.** Line 1: n integers; line 2: the integer k.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 1000; answer fits in 64-bit  
**Example.** `1 1 1
2` → `2` ([1,1] at two different positions.)  
**Example.** `3 4 -7 3 1 3
7` → `3` ([3,4], [3,1,3], and the whole array.)  
**Hints.** A stretch sum equals prefix[j] - prefix[i]. / So for each j count earlier prefixes equal to prefix[j] - k, using a hash map of counts.  
**Approach.** Track the running prefix sum and a map from prefix value to how many times it has occurred (starting with 0 once). For each new prefix p add count[p-k] to the answer, then record p. (O(n) time, O(n) space)  
**Edge cases.** negative numbers; k = 0 with zeros; single element equals k

### Longest run of tickets
`dc-a-longest-ticket-run` · medium · 45 min

Raffle tickets are drawn in random order. Find the length of the longest group of drawn numbers that form consecutive integers (like 7, 8, 9, 10), regardless of the order they were drawn. Do it faster than sorting.

**Input.** One line of n integers (duplicates possible).  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; values fit in 32-bit  
**Example.** `9 1 8 3 2 7 10 11` → `5` (7, 8, 9, 10, 11 are all present.)  
**Example.** `5` → `1` (A single number is a run of length 1.)  
**Hints.** Put all numbers in a hash set. / Only start counting from numbers whose predecessor x-1 is absent.  
**Approach.** Insert everything into a set. For each x with x-1 missing, extend upward while x+1 exists and track the longest length. Each number is visited at most twice overall. (O(n) time, O(n) space)  
**Edge cases.** duplicates; negative numbers; all identical

### Pairs with a fixed gap
`dc-a-gap-pairs` · medium · 45 min

Count the distinct pairs of values (x, y) from an array with y - x = k, where k ≥ 0. Pairs are counted by value, not position; for k = 0 the pair (x, x) needs x to appear at least twice.

**Input.** Line 1: n integers; line 2: the integer k.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ k ≤ 10^9  
**Example.** `1 5 3 4 2
2` → `3` ((1,3), (3,5), (2,4).)  
**Example.** `1 1 1
0` → `1` (Only the value 1 repeats, so one pair (1,1).)  
**Hints.** Count occurrences with a hash map. / For k>0 count values x such that x+k is also present; k=0 is a special case.  
**Approach.** Build a frequency map. If k is 0, count values with frequency at least 2; otherwise count values x for which x+k is a key in the map. (O(n) time, O(n) space)  
**Edge cases.** k = 0; duplicates with k > 0; single element

## heaps

### Merge many sorted logs
`dc-b-merge-many-logs` · medium · 45 min

Several servers each produce a log of timestamps already sorted in increasing order. Merge all of them into one sorted sequence, using a heap that always holds just one candidate per log.

**Input.** k lines, each a non-empty sorted list of integers.  
**Output.** One line with all values in sorted order.  
**Constraints.** 1 ≤ k ≤ 1000; total values ≤ 10^5  
**Example.** `1 4 7
2 5
3 6 9` → `1 2 3 4 5 6 7 9` (Repeatedly taking the smallest head: 1 2 3 4 5 6 7 9.)  
**Example.** `5
1 1
3` → `1 1 3 5` (Duplicates stay: 1 1 3 5.)  
**Hints.** Only the first unused element of each list can be the next output. / Push (value, list index, position) for each list; pop the smallest and push that list's next element.  
**Approach.** Seed a min-heap with the first element of every list. Pop the smallest, output it, and push the next element from the same list, if any. (O(N log k) time, O(k) extra space)  
**Edge cases.** One list; Lists of very different lengths; Equal values across lists

### Live median
`dc-b-live-median` · medium · 45 min

Numbers arrive one at a time. After each arrival, report the median of everything seen so far: the middle value for an odd count, or the average of the two middle values for an even count. Print each median with exactly one decimal place.

**Input.** One line of integers in arrival order.  
**Output.** One line with the median after each arrival, one decimal place each.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `5 15 1 3` → `5.0 10.0 5.0 4.0` (Medians: 5, (5+15)/2=10, 5, (3+5)/2=4.)  
**Example.** `10 -4 6` → `10.0 3.0 6.0` (Medians: 10, (10-4)/2=3, then 6.)  
**Hints.** Splitting the data into a lower half and an upper half makes the middle easy to read. / Keep a max-heap for the lower half and a min-heap for the upper half, balanced to differ in size by at most one.  
**Approach.** Maintain a max-heap of the smaller half and a min-heap of the larger half. Insert through one heap into the other to keep order, then rebalance so sizes differ by at most one. The median is the top of the larger heap or the mean of both tops. (O(n log n) time, O(n) space)  
**Edge cases.** Single element; Duplicates; Negative values

### How many meeting rooms
`dc-b-meeting-room-count` · medium · 45 min

Each meeting has a start time and an end time, and a room is free again exactly at the end time (a meeting ending at 5 and another starting at 5 can share a room). Find the minimum number of rooms needed to hold all meetings.

**Input.** One line per meeting: 'start end' with start < end.  
**Output.** The minimum number of rooms.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `0 30
5 10
15 20` → `2` (The long meeting overlaps both short ones, but those two do not overlap each other: 2 rooms.)  
**Example.** `1 2
2 3
3 4` → `1` (Each meeting starts exactly when the previous ends: 1 room.)  
**Hints.** Process meetings in order of start time. / Keep a min-heap of end times of rooms in use; free the rooms whose end time is at most the new start.  
**Approach.** Sort by start time. For each meeting, pop all end times that are ≤ the start, push the new end time, and track the maximum heap size. (O(n log n) time, O(n) space)  
**Edge cases.** Single meeting; All meetings overlap; Back-to-back meetings

### k-th in a sorted grid
`dc-b-kth-in-sorted-grid` · medium · 45 min

A grid of integers has every row sorted left to right and every column sorted top to bottom. Find the k-th smallest value in the whole grid (counting duplicates) without flattening and sorting everything.

**Input.** Line 1: k. Remaining lines: the rows of the grid.  
**Output.** The k-th smallest value.  
**Constraints.** 1 ≤ k ≤ r*c; grid up to 300 x 300  
**Example.** `5
1 3 7
2 4 8
6 9 10` → `6` (Sorted values are 1 2 3 4 6 7 8 9 10, so the 5th is 6.)  
**Example.** `1
4 5
6 7` → `4` (The smallest value is the top-left cell, 4.)  
**Hints.** The smallest value is always the top-left cell. / Use a min-heap seeded with the first column (or first row); pop k times, each time pushing the popped cell's right neighbour.  
**Approach.** Push (value, row, col) for the first cell of every row. Pop the smallest k times; after each pop, push the next cell in the same row. The k-th popped value is the answer. (O(k log r) time, O(r) space)  
**Edge cases.** k = 1; k = r*c; Single row or column

## intervals

### How many rooms
`dc-a-rooms-needed` · medium · 45 min

Meetings are half-open intervals [start, end). Find the minimum number of rooms so that no two overlapping meetings share a room.

**Input.** Line 1: n; then n lines "start end".  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ start < end ≤ 10^9  
**Example.** `3
1 4
2 5
4 6` → `2` (At time 2 two meetings run; the one at 4 reuses the freed room.)  
**Example.** `2
1 2
3 4` → `1` (No overlap at all.)  
**Hints.** Sort start times and end times separately. / Sweep: a meeting that starts after an earlier one has ended can reuse that room.  
**Approach.** Sort starts and ends separately. For each start in order, advance the end pointer while ends are ≤ the start (freed rooms); the rooms in use are starts consumed minus ends passed. Track the maximum. (O(n log n) time, O(n) space)  
**Edge cases.** all identical; end equals next start; one meeting

### Slot in a new booking
`dc-a-slot-in-the-booking` · medium · 45 min

A sorted list of non-overlapping closed bookings is given, plus a new booking. Insert it, merging with any bookings it overlaps or touches, and print the final sorted list, one interval per line.

**Input.** Line 1: n; n lines of intervals; then one line with the new interval.  
**Output.** The resulting intervals, one per line.  
**Constraints.** 1 ≤ n ≤ 10^5; values ≤ 10^9  
**Example.** `2
1 2
5 6
3 4` → `1 2
3 4
5 6` (The new booking fits between the two without touching.)  
**Example.** `2
1 5
8 9
4 8` → `1 9` (It bridges both existing bookings.)  
**Hints.** Copy intervals that end before the new one starts. / Then merge all that overlap it, then copy the rest.  
**Approach.** Scan in three phases: add intervals ending before the new start, merge every interval with start ≤ new end by widening the new interval, then append the merged one and the remaining intervals. (O(n) time, O(n) space)  
**Edge cases.** new before all; new after all; new covers everything

### Cancel the fewest
`dc-a-cancel-the-fewest` · medium · 45 min

Events are half-open intervals [start, end) and must not overlap (touching is allowed). Find the minimum number of events to cancel so that the remaining events are pairwise non-overlapping.

**Input.** Line 1: n; then n lines "start end".  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; start < end ≤ 10^9  
**Example.** `4
1 3
2 4
3 5
1 6` → `2` (Keep [1,3) and [3,5); cancel the other two.)  
**Example.** `2
1 2
3 4` → `0` (Nothing overlaps.)  
**Hints.** Maximise the number of events you keep. / Sort by end time and greedily keep any event that starts after the last kept end.  
**Approach.** Sort by end time; keep an event whenever its start is at least the end of the last kept event. The cancellations are n minus the kept count. (O(n log n) time, O(1) extra space)  
**Edge cases.** all identical; all disjoint; one event

### Fewest stakes
`dc-a-fewest-stakes` · medium · 45 min

Closed ranges are laid out on a line, and you may drive stakes at integer positions. A range is hit if a stake lies within it (endpoints included). Find the minimum number of stakes needed so that every range is hit.

**Input.** Line 1: n; then n lines "start end".  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; start ≤ end; values fit in 32-bit  
**Example.** `3
1 4
2 5
6 7` → `2` (A stake at 4 hits the first two; another at 7 hits the last.)  
**Example.** `3
1 2
2 3
3 4` → `2` (A stake at 2 hits the first two; the third needs another.)  
**Hints.** Sort by right endpoint. / Place a stake at the end of the first unhit range; it hits all ranges that start at or before it.  
**Approach.** Sort by end. Place a stake at the end of the first uncovered range, count it, and skip every following range whose start is ≤ the stake; repeat with the next uncovered range. (O(n log n) time, O(1) extra space)  
**Edge cases.** all identical; all disjoint; nested ranges

## language-idioms

### C: linked stack, no leaks
`dc-d-c-malloc-stack` · medium · 45 min

In C, implement a stack as a singly linked list whose nodes are allocated with malloc. Process commands: 'push x' adds an int and 'pop' prints the top value (or EMPTY if the stack is empty). At the end free every remaining node so a leak checker such as valgrind would report nothing.

**Input.** First line the number of commands q, then q commands.  
**Output.** One line per pop with the popped value or EMPTY.  
**Constraints.** 1 ≤ q ≤ 10^5  
**Example.** `5
push 4
push 7
pop
pop
pop` → `7
4
EMPTY` (7, 4, EMPTY)  
**Example.** `3
push 1
push 2
pop` → `2` (the last pushed value comes off first -> 2)  
**Hints.** Each node holds a value and a next pointer; the stack is just a pointer to the top node. / When popping, save the next pointer and the value before calling free on the node.  
**Approach.** push mallocs a node and links it in front of the head; pop reads head->value, moves head to head->next, frees the old node; a final loop frees leftovers. (O(1) per operation, O(n) space)  
**Edge cases.** Pop on empty; Leftover nodes at exit; Use after free when reading the value

### C++: move-only token
`dc-d-cpp-pass-the-token` · medium · 45 min

In C++, model a unique resource with a move-only class Token (delete the copy constructor and copy assignment, provide move operations). n people numbered 0..n-1 pass it around; person 0 holds it at the start. Each command 'a b' says person a hands the token to person b. If a does not hold it, print ERR and change nothing; otherwise print OK. Finally print 'owner X'. Implement each person as an std::optional<Token> or unique_ptr slot and transfer with std::move.

**Input.** First line n and m, then m lines 'a b'.  
**Output.** m lines of OK/ERR then 'owner X'.  
**Constraints.** 2 ≤ n ≤ 100; 1 ≤ m ≤ 1000  
**Example.** `3 3
0 1
0 2
1 2` → `OK
ERR
OK
owner 2` (OK, then person 0 no longer has it so ERR, then OK, owner 2)  
**Example.** `2 1
1 0` → `ERR
owner 0` (person 1 does not hold the token -> ERR, owner 0)  
**Hints.** A moved-from object is valid but unspecified; treat the source slot as empty after std::move. / Deleting the copy operations makes accidental copies a compile error.  
**Approach.** Keep slots[i] as optional<Token>; on 'a b' check slots[a].has_value(), then slots[b] = std::move(slots[a]) and reset slots[a]. Track the owner index to print at the end. (O(m) time, O(n) space)  
**Edge cases.** Self-transfer 'a a'; Handing over a token you do not hold; Many transfers in a chain

### C++: tree owned by unique_ptr
`dc-d-cpp-unique-ptr-bst` · medium · 45 min

In C++, build a binary search tree where each node owns its children through std::unique_ptr<Node> (no raw new/delete in your own code, no manual destructor). Insert the given values in order, ignoring duplicates, and print an in-order traversal. When the root goes out of scope the whole tree must be freed automatically.

**Input.** First line n, second line n integers.  
**Output.** The distinct values in increasing order.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `5
4 2 6 2 1` → `1 2 4 6` (duplicate 2 ignored -> 1 2 4 6)  
**Example.** `1
5` → `5` (single node)  
**Hints.** Insert recursively through a reference to the unique_ptr slot: if the slot is empty, assign make_unique<Node>(v). / Recursive destruction of unique_ptr nodes is automatic, but very deep trees can overflow the stack.  
**Approach.** insert(std::unique_ptr<Node>& slot, v): create the node when the slot is empty, otherwise recurse left or right; an in-order recursion prints the sorted values. (O(n log n) average time, O(n) space)  
**Edge cases.** Duplicates; Sorted input gives a deep tree; Single value

### Rust: Result and the ? operator
`dc-d-rust-result-lines` · medium · 45 min

In Rust, write fn parse_line(s: &str) -> Result<i64, ParseError> where ParseError is your own enum with variants Empty and Bad. Return Empty for a blank line and Bad when the text is not a valid integer (use map_err and the ? operator). In main, read n lines, add up the valid ones and count the failures; print the sum and the failure count.

**Input.** First line n, then n lines of text.  
**Output.** The sum of valid integers and the number of invalid or blank lines, separated by a space.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `3
10
abc
-3` → `7 1` (abc is invalid; 10 + (-3) = 7 with 1 failure)  
**Example.** `1
 42 ` → `42 0` (surrounding spaces are trimmed -> 42 0)  
**Hints.** Trim the line first, then check is_empty before calling parse::<i64>(). / map_err converts std::num::ParseIntError into your enum so ? can propagate it.  
**Approach.** parse_line trims; empty -> Err(Empty); s.parse::<i64>().map_err(|_| ParseError::Bad)?; main matches on the Result and updates the sum or failure counter. (O(total length) time, O(1) extra space)  
**Edge cases.** Blank lines (blank is Empty, not Bad); Overflowing numbers count as Bad; Leading plus sign is valid for parse

### Go: worker pool
`dc-d-go-worker-pool` · medium · 45 min

In Go, sum the squares of n numbers using w worker goroutines. Send the numbers on a jobs channel, have each worker read from it with range, and send each square on a results channel; use a sync.WaitGroup to close the results channel once all workers finish. The main goroutine adds up the results and prints the total.

**Input.** First line n and w, second line n integers.  
**Output.** The sum of squares.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ w ≤ 16; |values| ≤ 10^4  
**Example.** `4 2
1 2 3 4` → `30` (1+4+9+16 = 30)  
**Example.** `1 3
-5` → `25` (more workers than jobs still works -> 25)  
**Hints.** Close the jobs channel after sending so the workers' range loops end. / Close the results channel from a separate goroutine that waits on the WaitGroup, otherwise main never stops reading.  
**Approach.** Start w workers each doing for x := range jobs { results <- x*x }. A producer goroutine feeds and closes jobs, another goroutine does wg.Wait() then close(results), and main sums over range results. (O(n) time of work spread across w workers, O(w) goroutines)  
**Edge cases.** w greater than n; Negative inputs; Deadlock if channels are never closed

## linked-lists

### Add digit chains
`dc-b-add-digit-chains` · medium · 45 min

Two non-negative numbers are stored as linked lists of single digits with the least significant digit first. Add them and print the sum in the same format (least significant digit first).

**Input.** Two lines of digits, least significant first.  
**Output.** The sum's digits, least significant first.  
**Constraints.** 1 ≤ length ≤ 10^4; no leading zeros except the number 0  
**Example.** `9 9 1
5 1` → `4 1 2` (199 + 15 = 214, written backwards: 4 1 2.)  
**Example.** `9 9 9
1` → `0 0 0 1` (999 + 1 = 1000, written backwards: 0 0 0 1.)  
**Hints.** Add like on paper, one column at a time. / Keep a carry; at each step add the two digits (0 if a list has ended) and the carry, emit sum % 10, carry = sum // 10.  
**Approach.** Walk both lists together, adding digits plus carry and appending sum % 10 to a result list. Continue while either list has nodes or the carry is non-zero. (O(max(n, m)) time, O(1) extra beyond output)  
**Edge cases.** Different lengths; Final carry creates a new digit; Both are 0

### Rotate the chain
`dc-b-rotate-chain` · medium · 45 min

Rotate a linked list to the right by k places: each step moves the last node to the front. k can be larger than the list length. Print the rotated list.

**Input.** Line 1: the list (non-empty). Line 2: k.  
**Output.** The rotated list.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ k ≤ 10^9  
**Example.** `1 2 3 4 5
2` → `4 5 1 2 3` (The last two nodes 4 5 move to the front: 4 5 1 2 3.)  
**Example.** `10 20 30
4` → `30 10 20` (4 mod 3 = 1, so one move: 30 10 20.)  
**Hints.** Rotating by the length returns the same list. / Reduce k modulo the length; find the new tail at position n-k-1, cut there and join the old tail to the old head.  
**Approach.** Compute the length n while locating the tail, and set k = k mod n. Close the list into a ring, walk n-k-1 nodes from the head to find the new tail, and break the ring after it. (O(n) time, O(1) extra space)  
**Edge cases.** k multiple of n; k = 0; Single node

### Loop entrance
`dc-b-loop-entrance` · medium · 45 min

A linked list may have a loop: its tail links back to some earlier node. Print the value of the node where the loop begins (the first node visited twice), or the word none if there is no loop. The input tells you the tail's target index, but your method should not rely on it.

**Input.** Line 1: node values (distinct). Line 2: tail target index or -1.  
**Output.** The value of the loop's entry node, or none.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `5 6 7 8 9
2` → `7` (The tail links back to index 2, whose value is 7.)  
**Example.** `1 2 3
-1` → `none` (No loop, so none.)  
**Hints.** First detect the loop with slow/fast pointers. / After they meet, restart one pointer at the head; moving both one step at a time they meet again at the entrance.  
**Approach.** Detect the loop with Floyd's algorithm. When slow meets fast, put a pointer at the head and advance both by one node; they meet at the loop entrance. If fast hits null there is no loop. (O(n) time, O(1) extra space)  
**Edge cases.** Tail points to itself; Loop starts at the head; No loop

### Weave the ends
`dc-b-weave-ends` · medium · 45 min

Reorder a linked list L0, L1, ..., Ln into L0, Ln, L1, Ln-1, L2, Ln-2, ... by relinking nodes (not by changing values). Print the new order of values.

**Input.** One line of integers (at least one).  
**Output.** The reordered list.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 2 3 4` → `1 4 2 3` (1, then the last 4, then 2, then 3.)  
**Example.** `1 2 3 4 5` → `1 5 2 4 3` (1 5 2 4 3.)  
**Hints.** Pulling from the back of a singly linked list is awkward; can you reverse part of it? / Find the middle, reverse the second half, then interleave the first half with the reversed second half.  
**Approach.** Use slow/fast pointers to find the middle and split the list, reverse the second half, and merge the two halves alternately, taking one node from each. (O(n) time, O(1) extra space)  
**Edge cases.** Single node; Two nodes; Odd length

## math

### The nth smooth number
`dc-d-smooth-numbers` · medium · 45 min

Call a positive integer smooth if its only prime factors are 2, 3 and 5 (the number 1 counts as smooth). The smooth numbers in order are 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, ... Find the nth one.

**Input.** One integer n.  
**Output.** The nth smooth number.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `10` → `12` (the tenth listed number is 12)  
**Example.** `1` → `1` (the sequence starts with 1)  
**Hints.** Each smooth number is a smaller smooth number times 2, 3 or 5. / Keep three pointers into the sequence built so far, one per multiplier, and always take the smallest candidate.  
**Approach.** Build the sequence incrementally with three indices i2, i3, i5; the next element is min(2*u[i2], 3*u[i3], 5*u[i5]) and every index that produced it advances (handling duplicates). (O(n) time, O(n) space)  
**Edge cases.** n = 1; Duplicates like 6 = 2·3 = 3·2; Largest n

### Show the repeating decimal
`dc-d-repeating-decimal` · medium · 45 min

Write the fraction a/b in decimal. If the decimals repeat forever, put the repeating block in parentheses, for example 1/3 is 0.(3) and 1/6 is 0.1(6). Terminating decimals have no parentheses and integers have no decimal point.

**Input.** Two integers a and b on one line.  
**Output.** The decimal expansion as a string, with a leading minus if negative.  
**Constraints.** -10^6 ≤ a ≤ 10^6; b ≠ 0, |b| ≤ 10^6  
**Example.** `1 6` → `0.1(6)` (0.1(6))  
**Example.** `-7 4` → `-1.75` (7/4 = 1.75 exactly, with a minus sign)  
**Hints.** Long division: the next digit depends only on the current remainder. / If a remainder reappears, the digits between the two occurrences repeat; store the digit position where each remainder first appeared.  
**Approach.** Perform long division, mapping each remainder to the index of the digit it will produce; when a remainder repeats, insert parentheses from that index onward. (O(|b|) time and space)  
**Edge cases.** a is a multiple of b; Negative sign; Long cycles such as 1/97

### Giant Fibonacci index
`dc-d-giant-fibonacci` · medium · 45 min

With F(0) = 0, F(1) = 1 and F(k) = F(k-1) + F(k-2), compute F(n) modulo 1000000007 where n can be as large as 10^18, far too big for a simple loop.

**Input.** One integer n.  
**Output.** F(n) mod 1000000007.  
**Constraints.** 0 ≤ n ≤ 10^18  
**Example.** `10` → `55` (F(10) = 55)  
**Example.** `90` → `210345902` (F(90) = 2880067194370816120, which is 210345902 modulo 10^9+7)  
**Hints.** Fibonacci can be written as repeated multiplication of a 2x2 matrix. / Alternatively use the doubling identities F(2k) = F(k)(2F(k+1) - F(k)) and F(2k+1) = F(k)² + F(k+1)².  
**Approach.** Use fast doubling (or matrix exponentiation) to compute the pair (F(k), F(k+1)) recursively in O(log n) steps, reducing modulo p each time. (O(log n) time, O(log n) stack)  
**Edge cases.** n = 0; n = 1; n = 10^18

### Count in base minus two
`dc-d-negabinary` · medium · 45 min

An odd counter writes integers in base -2, where digit i has weight (-2)^i and digits are only 0 or 1. Convert a (possibly negative) decimal integer to its base -2 representation without a sign. Zero is written as 0.

**Input.** One integer n.  
**Output.** The base -2 digits as a string.  
**Constraints.** -10^9 ≤ n ≤ 10^9  
**Example.** `6` → `11010` (11010 = 16 - 8 - 2 = 6)  
**Example.** `-3` → `1101` (1101 = -8 + 4 + 1 = -3)  
**Hints.** Repeatedly divide by -2, but make the remainder 0 or 1. / If the remainder comes out -1, add 2 to it and add 1 to the quotient.  
**Approach.** Loop: r = n mod 2 (0 or 1), prepend r, then n = (n - r) / -2 until n is 0. (O(log |n|) time, O(log |n|) output)  
**Edge cases.** n = 0; Negative n; n = 1

### Count the bracket shapes
`dc-d-balanced-parens-count` · medium · 45 min

How many different strings of n opening and n closing brackets are balanced (every prefix has at least as many opens as closes)? Print the count modulo 1000000007. The answers follow the Catalan numbers 1, 1, 2, 5, 14, ...

**Input.** One integer n.  
**Output.** The count modulo 1000000007.  
**Constraints.** 0 ≤ n ≤ 1000  
**Example.** `3` → `5` (()()(), ()(()), (())(), (()()), ((()))  -> 5)  
**Example.** `0` → `1` (the empty string)  
**Hints.** Split on where the first bracket closes: C(n) = sum of C(i)·C(n-1-i). / A direct DP over n up to 1000 is quadratic and fine.  
**Approach.** Fill a table C[0] = 1, C[m] = sum_{i<m} C[i]·C[m-1-i] mod p up to n. (The closed form C(2n,n)/(n+1) also works with big integers.) (O(n²) time, O(n) space)  
**Edge cases.** n = 0; n = 1; n = 1000 requires the modulus

## matrices

### Staircase search
`dc-b-staircase-search` · medium · 45 min

In a matrix every row is sorted left to right and every column is sorted top to bottom. Decide whether a target value occurs anywhere in it, taking far fewer steps than looking at every cell.

**Input.** Line 1: the target. Remaining lines: the rows.  
**Output.** true or false.  
**Constraints.** 1 ≤ r, c ≤ 1000  
**Example.** `7
1 4 7 11
2 5 8 12
3 6 9 16` → `true` (7 is in the first row.)  
**Example.** `10
1 4 7 11
2 5 8 12
3 6 9 16` → `false` (The values near 10 are 9 and 11, but 10 is absent.)  
**Hints.** Pick a corner where moving in one direction increases values and in the other decreases them. / Start at the top-right: if the cell is too big move left, if too small move down.  
**Approach.** Start at the top-right cell. If it equals the target, done; if it exceeds the target, move left; otherwise move down. Stop when you leave the matrix. Each step discards a row or a column. (O(r + c) time, O(1) space)  
**Edge cases.** Target smaller than the minimum; Target larger than the maximum; Single cell

### Zigzag diagonals
`dc-b-zigzag-diagonals` · medium · 45 min

Read a matrix along its anti-diagonals (cells whose row plus column is the same), starting with the top-left cell. Diagonals with an even row+column sum are read upwards (from the bottom-left end to the top-right end) and diagonals with an odd sum are read downwards. Print the cells in reading order.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** All values in reading order on one line.  
**Constraints.** 1 ≤ r, c ≤ 300  
**Example.** `1 2
3 4
5 6` → `1 2 3 5 4 6` (Diagonals: 1 / 2 3 (down) / 5 4 (up) / 6: 1 2 3 5 4 6.)  
**Example.** `1 2 3 4` → `1 2 3 4` (Each diagonal is a single cell, so it is just the row: 1 2 3 4.)  
**Hints.** Group cells by i + j. / For each sum s, collect cells in increasing row order, then reverse the group when s is even.  
**Approach.** Iterate s from 0 to r+c-2, gather cells (i, s-i) that lie in bounds ordered by row, and reverse that list for even s. Concatenate the groups. (O(r*c) time and space)  
**Edge cases.** Single column; Wide matrix; Tall matrix

## number-theory

### Who is coprime with n
`dc-d-coprime-census` · medium · 45 min

Count the integers k with 1 ≤ k ≤ n such that gcd(k, n) = 1. This is Euler's totient of n. Computing gcd for every k is too slow for the largest n, so use the prime factors of n.

**Input.** One integer n.  
**Output.** The count of integers in [1, n] coprime to n.  
**Constraints.** 1 ≤ n ≤ 10^12  
**Example.** `12` → `4` (1, 5, 7, 11 -> 4)  
**Example.** `1` → `1` (gcd(1,1)=1 -> 1)  
**Hints.** Start from n and, for every distinct prime p of n, remove the fraction 1/p. / In integer form: result = result / p * (p - 1).  
**Approach.** Factorize n by trial division up to sqrt(n); for each distinct prime p set result = result / p * (p - 1). (O(sqrt n) time, O(1) space)  
**Edge cases.** n = 1; n prime gives n - 1; n a power of 2

### Undo a multiplication
`dc-d-undo-the-multiply` · medium · 45 min

A scrambler multiplies a secret x by a and keeps the result modulo m. To unscramble you need a number y with a·y ≡ 1 (mod m). Find the smallest non-negative such y, or -1 if none exists.

**Input.** Two integers a and m on one line.  
**Output.** The modular inverse of a modulo m or -1.  
**Constraints.** 1 ≤ a ≤ 10^9; 1 ≤ m ≤ 10^9  
**Example.** `3 11` → `4` (3·4 = 12 ≡ 1 (mod 11))  
**Example.** `6 9` → `-1` (gcd(6, 9) = 3, no inverse)  
**Hints.** An inverse exists exactly when gcd(a, m) = 1. / The extended Euclidean algorithm gives x, y with a·x + m·y = gcd.  
**Approach.** Run extended Euclid on (a mod m, m); if the gcd is not 1 return -1, otherwise return x mod m. (O(log m) time, O(log m) stack)  
**Edge cases.** m = 1 (everything is 0, answer 0); a a multiple of m; Large coprime values

### Primes in a far window
`dc-d-window-of-primes` · medium · 45 min

Count the primes in the closed range [l, r], where l and r can be as large as 10^12 but the range itself has at most 10^6 numbers. A full sieve up to r is impossible, so sieve only the window using small primes.

**Input.** Two integers l and r on one line.  
**Output.** The number of primes in [l, r].  
**Constraints.** 1 ≤ l ≤ r ≤ 10^12; r - l ≤ 10^6  
**Example.** `10 30` → `6` (11 13 17 19 23 29 -> 6)  
**Example.** `1 1` → `0` (1 is not prime -> 0)  
**Hints.** Any composite in [l, r] has a prime factor ≤ sqrt(r) ≤ 10^6. / For each small prime p, cross out multiples of p in the window starting from max(p², first multiple ≥ l).  
**Approach.** Sieve primes up to sqrt(r), then mark their multiples inside the window as composite (never crossing out p itself), and count unmarked values ≥ 2. (O((r-l) log log r + sqrt r) time, O(r-l + sqrt r) space)  
**Edge cases.** l = 1; Window contains small primes themselves; Window of length 1

### Two clocks, one moment
`dc-d-two-clocks-meet` · medium · 45 min

Clock A rings on day a, then every m days. Clock B rings on day b, then every n days (days counted from 0, with a < m and b < n). Find the earliest day on which both ring, or -1 if they never do. The moduli may share factors.

**Input.** Four integers a, m, b, n on one line.  
**Output.** The smallest non-negative day x with x ≡ a (mod m) and x ≡ b (mod n), or -1.  
**Constraints.** 1 ≤ m, n ≤ 10^9; 0 ≤ a < m; 0 ≤ b < n; answer fits in 64 bits  
**Example.** `2 3 3 5` → `8` (x = 8: 8 mod 3 = 2 and 8 mod 5 = 3)  
**Example.** `1 4 0 2` → `-1` (x is odd and even at once -> -1)  
**Hints.** Write x = a + m·k and require a + m·k ≡ b (mod n). / A solution exists only if gcd(m, n) divides b - a; divide everything by the gcd and use a modular inverse.  
**Approach.** Let g = gcd(m, n). If (b - a) is not divisible by g, return -1. Otherwise solve k ≡ ((b-a)/g)·inv(m/g) (mod n/g) and return a + m·k, which is below lcm(m, n). (O(log n) time, O(1) space)  
**Edge cases.** Moduli not coprime; No solution; n/g = 1 so k = 0

### Total of all divisor sums
`dc-d-divisor-sum-total` · medium · 45 min

Let σ(k) be the sum of all positive divisors of k. Compute σ(1) + σ(2) + ... + σ(n). Do not factor every number: think about how many multiples each d has.

**Input.** One integer n.  
**Output.** The sum of σ(k) for k = 1..n.  
**Constraints.** 1 ≤ n ≤ 10^7  
**Example.** `5` → `21` (1 + 3 + 4 + 7 + 6 = 21)  
**Example.** `1` → `1` (σ(1) = 1)  
**Hints.** Each d contributes d to every multiple of d up to n. / So d contributes d · floor(n/d) in total.  
**Approach.** Sum d · floor(n / d) for d from 1 to n. (O(n) time, O(1) space (O(sqrt n) with block grouping))  
**Edge cases.** n = 1; Large n needs 64-bit; n a prime

## parsing

### Calculator with brackets
`dc-d-bracket-calculator` · medium · 45 min

Extend a calculator to handle round brackets and unary minus (a minus sign in front of a number or a bracket, as in -(2+3) or 4*-2). Operators are + - * / with usual precedence and integer division truncating towards zero.

**Input.** One line containing the expression, spaces allowed.  
**Output.** The integer result.  
**Constraints.** Length ≤ 10^4; no division by zero; nesting depth ≤ 1000; results fit in 64 bits  
**Example.** `2*(3+4)-5` → `9` (14 - 5 = 9)  
**Example.** `-(2+3)*4 - -6` → `-14` (-20 + 6 = -14)  
**Hints.** Write a recursive-descent parser with three levels: expression (+ -), term (* /), factor (number, bracket, unary minus). / Each level calls the next one down and loops over its own operators.  
**Approach.** Recursive descent: expr = term {(+|-) term}; term = factor {(*|/) factor}; factor = '-' factor | '(' expr ')' | number. A single shared position index keeps the parse linear. (O(n) time, O(depth) space)  
**Edge cases.** Unary minus before a bracket; Nested brackets; Division of a negative number

### One careful CSV line
`dc-d-quoted-csv-line` · medium · 45 min

Split a single CSV record into fields. Fields are separated by commas; a field may be wrapped in double quotes, in which case it can contain commas, and a doubled quote "" inside it stands for one literal quote. Empty fields are allowed. Print the field count, then each field wrapped in square brackets on its own line.

**Input.** One line holding the CSV record.  
**Output.** The number of fields, then one bracketed field per line.  
**Constraints.** Line length ≤ 10^4; quotes are balanced  
**Example.** `a,"b,c",,d` → `4
[a]
[b,c]
[]
[d]` (4 fields: a / b,c / (empty) / d)  
**Example.** `"say ""hi""",x` → `2
[say "hi"]
[x]` (2 fields: say "hi" and x)  
**Hints.** Use a state flag for 'inside quotes'. / Inside quotes, a quote followed by another quote is an escaped quote; a lone quote ends the field.  
**Approach.** Single pass with an inQuotes flag: commas split fields only outside quotes; a doubled quote inside quotes appends one quote; other characters are appended. (O(n) time, O(n) space)  
**Edge cases.** Trailing comma means a final empty field; Empty line is one empty field; Quote at the very end

### Look up a setting
`dc-d-ini-lookup` · medium · 45 min

A configuration file uses INI format: lines like [section] start a section, key = value lines belong to the current section, and lines starting with ; or # are comments; blank lines are ignored. Keys before any section belong to the global section (empty name). Answer a query written as section.key (or just key for the global section).

**Input.** First line the query, then the config file lines.  
**Output.** The value (trimmed of spaces) or MISSING.  
**Constraints.** ≤ 1000 lines; keys and sections contain no dots or equals signs; a repeated key keeps its last value  
**Example.** `db.port
; settings
[db]
host = local
port = 5432` → `5432` (5432)  
**Example.** `name
[x]
name = inner` → `MISSING` (name is global, the only name is in section x -> MISSING)  
**Hints.** Track the current section name while scanning lines. / Split key and value at the first '=' and trim both.  
**Approach.** Parse line by line, maintaining the current section; store values in a dictionary keyed by (section, key); finally look up the query. (O(n) time, O(n) space)  
**Edge cases.** Comments and blank lines; Global keys; Repeated key overwrites

### From infix to postfix
`dc-d-shunting-yard` · medium · 45 min

Convert an infix expression with non-negative integers, + - * / and round brackets to postfix notation. All operators are left-associative, * and / bind tighter than + and -. Output the postfix tokens separated by single spaces.

**Input.** One line with the infix expression.  
**Output.** The postfix expression.  
**Constraints.** Length ≤ 10^4; valid input  
**Example.** `1+2*3` → `1 2 3 * +` (1 2 3 * +)  
**Example.** `(1+2)*3-4` → `1 2 + 3 * 4 -` (1 2 + 3 * 4 -)  
**Hints.** Keep an operator stack. Numbers go straight to the output. / Before pushing an operator, pop operators of greater or equal precedence from the stack to the output.  
**Approach.** Shunting-yard: output numbers directly; for an operator pop stack operators with precedence ≥ its own (left associativity) before pushing; '(' is pushed, ')' pops until the matching '('; flush the stack at the end. (O(n) time, O(n) space)  
**Edge cases.** Single number; Nested brackets; Equal precedence chains like 8-3-2

### Depth-weighted list total
`dc-d-nested-list-total` · medium · 45 min

A nested list is written like [1,[2,3],[[4],-5],[]] with integers, commas and square brackets. Parse it and output the sum weighted by depth: each integer is multiplied by how many brackets enclose it. So in [1,[2]] the 1 counts once and the 2 counts twice, for 5.

**Input.** One line with a valid nested list (no spaces).  
**Output.** The depth-weighted sum.  
**Constraints.** Length ≤ 10^5; nesting ≤ 1000  
**Example.** `[1,[2,3],[[4],-5],[]]` → `13` (1·1 + (2+3)·2 + 4·3 + (-5)·2 = 13)  
**Example.** `[[]]` → `0` (no integers -> 0)  
**Hints.** Track current depth while scanning characters; no need to build the structure. / When you read an integer, add depth × value.  
**Approach.** Scan characters, incrementing depth on '[' and decrementing on ']'; parse each integer (with optional minus) and add value × depth to the total. (O(n) time, O(1) space)  
**Edge cases.** Empty lists; Negative numbers; Deep nesting

### Unescape then show codes
`dc-d-unescape-codes` · medium · 45 min

A string literal contains escape sequences: \n (newline), \t (tab), \\ (one backslash), \xHH (the character with that two-digit hex code), and \ followed by any other character means that character itself. Decode the literal, then print the character codes of the decoded text, separated by |.

**Input.** One line with the raw literal text (without surrounding quotes).  
**Output.** The ASCII codes of the decoded characters joined by |.  
**Constraints.** Length ≤ 10^4; escapes are valid; decoded characters are ASCII  
**Example.** `a\tb` → `97|9|98` (a=97, tab=9, b=98 -> 97|9|98)  
**Example.** `\x41\\\n` → `65|92|10` (A, backslash, newline -> 65|92|10)  
**Hints.** Scan with an index; on a backslash look at the next character to decide how far to advance. / For \x, parse the next two characters as hexadecimal.  
**Approach.** Single pass with an index: copy normal characters, and on a backslash decode according to the following character, advancing by 2 (or 4 for \xHH). (O(n) time, O(n) space)  
**Edge cases.** Backslash followed by a backslash; \x at the end; No escapes

## prefix-sums

### Evenly shareable stretches
`dc-a-evenly-shareable-stretches` · medium · 45 min

Count the non-empty consecutive stretches of an array whose sum is divisible by k. Values may be negative.

**Input.** Line 1: n integers; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ k ≤ 10^4; |values| ≤ 10^4  
**Example.** `2 4 6 3
3` → `6` ([2,4], [2,4,6], [6], [6,3], [3], and the whole array.)  
**Example.** `3 3
3` → `3` ([3], [3], [3,3].)  
**Hints.** A stretch is divisible by k when two prefix sums have the same remainder. / Count equal remainders with a map, starting with remainder 0 once.  
**Approach.** Walk the array tracking the prefix sum modulo k (normalised to be non-negative). For each position add the number of earlier prefixes with the same remainder, then record this remainder. (O(n) time, O(k) space)  
**Edge cases.** negative numbers; k = 1; all zeros

### Even heads and tails
`dc-a-even-heads-and-tails` · medium · 45 min

A coin-flip log is a list of 0s (tails) and 1s (heads). Find the length of the longest consecutive stretch containing equally many 0s and 1s.

**Input.** One line of n values (0 or 1).  
**Output.** One integer; 0 if no balanced stretch exists.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `0 1 0 0 1 1 0` → `6` (The first six flips have three of each.)  
**Example.** `1 1 1` → `0` (No tails at all.)  
**Hints.** Treat 0 as -1 and 1 as +1 so a balanced stretch sums to 0. / Equal prefix sums at two positions mean the stretch between them sums to 0.  
**Approach.** Convert 0 to -1 and keep a running sum. Store the first index at which each prefix sum occurs; whenever the sum repeats, the stretch between has length current - first index. Keep the max. (O(n) time, O(n) space)  
**Edge cases.** no balanced stretch; whole array balanced; n = 1

### Long enough profit run
`dc-a-long-enough-profit` · medium · 45 min

Find the largest total over any consecutive stretch of at least L elements (L or more) in an array that may contain negative numbers.

**Input.** Line 1: n integers; line 2: L.  
**Output.** One integer.  
**Constraints.** 1 ≤ L ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `1 -2 3 4 -1
2` → `7` (3+4 = 7 beats all longer stretches.)  
**Example.** `-1 -2 -3
2` → `-3` (Best is the first two: -1-2 = -3.)  
**Hints.** A stretch ending at j is prefix[j] - prefix[i] with i ≤ j - L. / Maintain the minimum prefix among allowed starting points while scanning j.  
**Approach.** Build prefix sums. For each end j ≥ L track the minimum of prefix[0..j-L]; the candidate is prefix[j] minus that minimum. The maximum candidate is the answer. (O(n) time, O(n) space)  
**Edge cases.** L = n; L = 1; all negative

## queues

### Print queue turn
`dc-b-print-queue-turn` · medium · 45 min

A shared printer takes the job at the front of the queue; if any waiting job has a strictly higher priority, the front job goes to the back unprinted, otherwise it prints. Given every job's priority and the starting index of your job, report on which print (1-based) your job finally comes out.

**Input.** Line 1: priorities (integers). Line 2: the 0-based index of your job.  
**Output.** The 1-based print order of your job.  
**Constraints.** 1 ≤ n ≤ 10^4; priorities 1..9  
**Example.** `2 1 3 2
2` → `1` (Job 2 has priority 3 and is highest, so it prints first.)  
**Example.** `2 1 3 2
0` → `3` (Order of printing: job 2, job 3, job 0, job 1, so job 0 is third.)  
**Hints.** Store (index, priority) pairs so you can recognise your job. / Count down priorities: only the highest-priority jobs print, and among equals they print in queue order.  
**Approach.** Simulate with a queue of (index, priority). If the front's priority is the maximum among those waiting, print it and increment the counter; otherwise requeue it. Stop when your index prints. (O(n^2) worst case time with a max scan, O(n) space)  
**Edge cases.** Single job; All priorities equal; Your job is last with the lowest priority

### Window peaks
`dc-b-window-peaks` · medium · 45 min

A sensor reports readings and you care about the highest reading in every block of k consecutive readings. Slide the block one step at a time from left to right and print each block's maximum.

**Input.** Line 1: the readings. Line 2: the integer k.  
**Output.** One line with n-k+1 integers.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5  
**Example.** `4 2 12 3 8 1
3` → `12 12 12 8` (Blocks [4 2 12],[2 12 3],[12 3 8],[3 8 1] have maxima 12,12,12,8.)  
**Example.** `5 4 3 2 1
2` → `5 4 3 2` (Blocks hold 5,4,3,2 as their first elements, each the maximum.)  
**Hints.** Recomputing the max for every block is O(nk). / Keep a deque of indices whose values are decreasing; the front is the current maximum.  
**Approach.** Maintain a deque of indices with decreasing values. Before pushing index i, pop smaller values from the back; pop the front if it left the window. After the first k-1 steps the front's value is the block maximum. (O(n) time, O(k) space)  
**Edge cases.** k = 1; k = n; Strictly increasing or decreasing readings

## recursion

### Depth-weighted sum
`dc-c-depth-weighted` · medium · 45 min

A nested list is written like [1,[2,3],[[4]]], with integers and lists inside lists. The outermost list has depth 1, lists inside it depth 2, and so on. Each integer is multiplied by the depth of the list that directly contains it. Print the sum of those products.

**Input.** One line with a nested list using brackets, commas and integers (no spaces).  
**Output.** One integer: the depth-weighted sum.  
**Constraints.** Total length ≤ 10^4; nesting ≤ 1000; values in [-1000, 1000]  
**Example.** `[1,[2,3],[[4]]]` → `23` (1·1 + (2+3)·2 + 4·3 = 23.)  
**Example.** `[[],[5]]` → `10` (Empty list adds nothing; 5 sits at depth 2: 10.)  
**Hints.** Write a function that parses one list at a given depth and returns its contribution. / On '[' call recursively with depth+1; on a number add value·depth.  
**Approach.** Recursive descent: parse a list starting at '[', iterating items; integers contribute value·depth, nested lists recurse with depth+1. A shared index tracks the position. (O(n) time, O(depth) stack)  
**Edge cases.** Empty list []; Negative numbers; Deep nesting

### Unpack the repeats
`dc-c-unpack-repeats` · medium · 45 min

A compressed message uses the form k[text], meaning that text is repeated k times, and these blocks can nest, as in 2[a3[b]]. Letters outside any brackets are copied as they are. Expand the message.

**Input.** One compressed string of lowercase letters, digits and brackets, always well-formed.  
**Output.** The fully expanded string.  
**Constraints.** Expanded length ≤ 10^5; k ≤ 100 (may have several digits)  
**Example.** `3[ab2[c]]` → `abccabccabcc` (ab2[c] expands to abcc, repeated 3 times.)  
**Example.** `2[xy]z` → `xyxyz` (xyxy followed by z.)  
**Hints.** Parse until you see ']' or the end of the string. / When you read a number then '[', recurse to get the inner text and repeat it.  
**Approach.** Recursive function that accumulates text; on digits it reads the full number, skips '[', recurses to get the inner expansion, multiplies it, and skips ']'. (O(output length) time, O(depth) stack)  
**Edge cases.** No brackets; Multi-digit repeat; Nested three levels

### Evaluate a prefix expression
`dc-c-prefix-expression` · medium · 45 min

In prefix notation the operator comes before its two operands: + 3 * 2 4 means 3 + (2 * 4). Operands can themselves be prefix expressions. Evaluate such an expression made of integers and the operators +, - and *, using recursion.

**Input.** One line of space-separated tokens forming a valid expression.  
**Output.** One integer: the value.  
**Constraints.** Up to 10^4 tokens; result fits in 64 bits  
**Example.** `+ 3 * 2 4` → `11` (3 + 2·4 = 11.)  
**Example.** `- * 5 2 3` → `7` (5·2 - 3 = 7.)  
**Hints.** Read one token; if it is a number you are done. / If it is an operator, evaluate two sub-expressions in order and combine.  
**Approach.** A recursive function consumes tokens from a shared index: numbers return themselves, operators call the function twice for left and right operands. (O(n) time, O(depth) stack)  
**Edge cases.** Single number; Negative result; Deep left-leaning expression

## simulation

### Bank queue waiting
`dc-d-bank-queue-wait` · medium · 45 min

A bank has t tellers. Customers arrive at known times (sorted) and each needs a known service time. When a customer arrives they take the teller who becomes free first (lowest index on ties); if all are busy they wait. Compute the total waiting time over all customers.

**Input.** First line t and m, then m lines each with arrival time and service duration.  
**Output.** The sum over customers of (service start - arrival).  
**Constraints.** 1 ≤ t ≤ 100; 1 ≤ m ≤ 10^5; times ≤ 10^9  
**Example.** `1 3
0 5
1 2
2 1` → `9` (waits: 0, 4, 5 -> 9)  
**Example.** `2 3
0 4
0 4
1 1` → `3` (third customer waits 3 -> 3)  
**Hints.** Track the time each teller becomes free. / A customer starts at max(arrival, teller free time).  
**Approach.** Process customers in order; pick the teller with the smallest free time (use a min-heap for speed), start = max(arrival, free), add start - arrival to the total, and set free = start + service. (O(m log t) time, O(t) space)  
**Edge cases.** Nobody waits; More tellers than customers; Large times (use 64-bit)

### Petri dish generations
`dc-d-petri-dish-life` · medium · 45 min

A petri dish is an h × w grid of cells, # for alive and . for empty; cells beyond the edge are empty. In each generation a live cell with 2 or 3 live neighbours (of 8) survives, a dead cell with exactly 3 live neighbours becomes alive, and every other cell is dead next turn. Print the grid after k generations.

**Input.** First line h, w, k; then h lines of the grid.  
**Output.** The grid after k generations, h lines.  
**Constraints.** 1 ≤ h, w ≤ 30; 0 ≤ k ≤ 100  
**Example.** `3 3 1
...
###
...` → `.#.
.#.
.#.` (.#.
.#.
.#.)  
**Example.** `2 2 3
##
##` → `##
##` (a 2x2 block never changes: ##
##)  
**Hints.** Compute the next grid from the current one into a separate array so updates do not interfere. / Count neighbours with bounds checks.  
**Approach.** Repeat k times: for every cell count live neighbours in the previous grid and apply the rules into a new grid. (O(k h w) time, O(h w) space)  
**Edge cases.** k = 0 prints the input; Corners and edges; Blinker oscillation

### Where did my card go
`dc-d-riffle-tracker` · medium · 45 min

A deck of n cards (n even) sits in positions 0..n-1 from the top. A perfect riffle splits it into the top half and bottom half and interleaves them starting with the top half's first card: new order is t0, b0, t1, b1, ... After k such riffles, what position holds the card that started at position p?

**Input.** Three integers n, k, p.  
**Output.** The final position of that card.  
**Constraints.** 2 ≤ n ≤ 10^6 even; 0 ≤ k ≤ 10^18; 0 ≤ p < n  
**Example.** `8 1 3` → `6` (3 is in the top half (t3) and lands at 6)  
**Example.** `8 3 5` → `5` (5 -> 3 -> 6 -> 5, a full cycle of order 3 returns it)  
**Hints.** Track just one card instead of the whole deck: top-half cards at i move to 2i, bottom-half cards to 2(i - n/2) + 1. / The positions form a cycle; k can be reduced modulo the cycle length, or just simulate with a cycle check.  
**Approach.** Apply the position map: p -> 2p if p < n/2 else 2(p - n/2) + 1. Since the map is a permutation the position repeats within n steps; reduce k by the cycle length found when the start position recurs. (O(n) time, O(1) space)  
**Edge cases.** k = 0; p = 0 and p = n-1 stay fixed; Huge k

### Three-cell snake
`dc-d-snake-three-cells` · medium · 45 min

A snake of length 3 lives on an n × n board (rows and columns 0..n-1, row 0 at the top). It starts with its head at (0, 2), body at (0, 1) and tail at (0, 0). Each command U, D, L, R moves the head one cell; the rest of the body follows, so the tail leaves its cell. Report the 1-based index of the first command that makes the head leave the board (WALL i) or land on its own body (BITE i), or SAFE if all commands succeed. The tail's old cell counts as free after the move.

**Input.** First line n, second line the command string.  
**Output.** WALL i, BITE i, or SAFE.  
**Constraints.** 3 ≤ n ≤ 100; 1 ≤ commands ≤ 10^4  
**Example.** `4
DLLU` → `SAFE` (the head visits (1,2), (1,1), (1,0), (0,0); the tail left (0,0) long before -> SAFE)  
**Example.** `4
RRR` → `WALL 2` (head hits column 4 on the 2nd R -> WALL 2)  
**Hints.** Store the body as a deque of cells, head first. / On each move compute the new head, drop the tail first, then check collision with the remaining body.  
**Approach.** Simulate with a deque: compute the new head, check bounds, pop the tail, check the remaining body cells (a set makes this O(1)), then push the new head. (O(m) time, O(1) space since length is fixed)  
**Edge cases.** Moving into the cell the tail just left is allowed; Moving straight back into the neck (L as the first command) is a BITE; Wall on first move

### Falling dominoes
`dc-d-domino-line` · medium · 45 min

A row of dominoes is given as a string: L means pushed left, R pushed right, . means standing still. Each second a falling domino knocks its neighbour in the direction of falling, but a standing domino pushed from both sides at the same second stays upright. Print the final state once everything settles.

**Input.** One string over L, R and ..  
**Output.** The final string of the same length.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `R..L.` → `RRLL.` (R at 0 and L at 3 meet: cells 1 and 2 fall towards each other; the last cell is untouched)  
**Example.** `.L.R...LR..L..` → `LL.RR.LLRRLL..` (LL.RR.LLRRLL..)  
**Hints.** Between two pushed dominoes, three cases: R...L meet in the middle, L...R do nothing, R...R and L...L spread fully. / Alternatively compute a 'force' on each domino from the nearest R on the left and nearest L on the right.  
**Approach.** Scan left to right giving each position a force that decays with distance from the last R (reset by L), scan right to left for L, and the sign of the net force gives the final state. (O(n) time, O(n) space)  
**Edge cases.** No pushed dominoes; Equal distance between R and L stays standing; Pushed dominoes at the borders

## sliding-window

### Shortest stretch that is enough
`dc-a-shortest-enough-stretch` · medium · 45 min

Each day a battery gathers a positive amount of charge. Find the shortest run of consecutive days whose total charge is at least a target, and print its length, or 0 if even all days together are not enough.

**Input.** Line 1: n positive integers; line 2: the target.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ values ≤ 10^4; 1 ≤ target ≤ 10^9  
**Example.** `1 4 4 2
8` → `2` (4+4 = 8 uses two days.)  
**Example.** `1 1 1
10` → `0` (Total is 3 < 10.)  
**Hints.** All values are positive, so the sum grows when the window grows. / Shrink from the left as long as the sum stays ≥ target.  
**Approach.** Grow the right end adding values; while the sum meets the target, record the window length and shrink from the left. Positive values make this two-pointer scan valid. (O(n) time, O(1) extra space)  
**Edge cases.** target met by a single element; never met; whole array needed

### Few flavours stretch
`dc-a-few-flavours` · medium · 45 min

A conveyor belt carries candies, each shown as a lowercase letter for its flavour. Find the longest run of consecutive candies containing at most k different flavours.

**Input.** Line 1: the string; line 2: the integer k.  
**Output.** One integer.  
**Constraints.** 1 ≤ length ≤ 10^5; 1 ≤ k ≤ 26  
**Example.** `aabbcc
2` → `4` ("aabb" or "bbcc".)  
**Example.** `abc
1` → `1` (Every run with one flavour has length 1.)  
**Hints.** Track counts of each flavour in the window. / Shrink from the left while there are more than k distinct flavours.  
**Approach.** Slide a window with a count map. After adding the right character, while the map has more than k keys remove from the left (deleting zero counts). The answer is the largest window seen. (O(n) time, O(k) space)  
**Edge cases.** k larger than distinct flavours; all same flavour; length 1

### Scrambled sightings
`dc-a-scrambled-sightings` · medium · 45 min

Given a text and a short pattern, list every starting index (0-based) where a substring of the text is a rearrangement of the pattern. Print the indices in increasing order, or "-" if there are none.

**Input.** Line 1: the text; line 2: the pattern.  
**Output.** Space-separated indices, or "-".  
**Constraints.** 1 ≤ pattern length ≤ text length ≤ 10^5; lowercase letters  
**Example.** `abxbaxab
abx` → `0 2 3 5` (abx, xba, bax, xab are rearrangements.)  
**Example.** `aaaa
aa` → `0 1 2` (Every window of two a's matches.)  
**Hints.** The window length is fixed at len(pattern). / Compare letter counts of the window with the pattern counts as it slides.  
**Approach.** Keep letter counts for the pattern and for the current window of the same length. On each slide update two counts and compare the count arrays (26 entries), recording the start when equal. (O(26 n) time, O(1) extra space)  
**Edge cases.** pattern longer than text; no matches; overlapping matches

### Forgiving streak
`dc-a-forgiving-streak` · medium · 45 min

A habit tracker shows 1 for a day you did the habit and 0 for a day you missed. You may pretend that up to k missed days were successes. What is the longest streak of consecutive 1s you could claim?

**Input.** Line 1: n values (0 or 1); line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ k ≤ n  
**Example.** `1 0 0 1 1 0 1
1` → `4` (Flip the zero at index 5 to join 1 1 0->1 1: days 3 to 6.)  
**Example.** `0 0 0
2` → `2` (Any two of the three zeros.)  
**Hints.** Slide a window and count zeros inside it. / If zeros exceed k, advance the left end.  
**Approach.** Expand the right end, counting zeros. While the zero count is above k, move the left end forward (decrementing the count when leaving a zero). The best window length is the answer. (O(n) time, O(1) extra space)  
**Edge cases.** k = 0; all ones; k ≥ number of zeros

### All-different week
`dc-a-all-different-week` · medium · 45 min

Among all windows of exactly k consecutive values in which every value is different, find the largest sum. If no such window exists print 0.

**Input.** Line 1: n integers; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5; 1 ≤ values ≤ 10^4  
**Example.** `4 4 2 5 6 1
3` → `13` (Windows: 4 4 2 invalid, 4 2 5 = 11, 2 5 6 = 13, 5 6 1 = 12.)  
**Example.** `1 1 1
2` → `0` (Every window has a repeat.)  
**Hints.** Track counts of values in the window and the number of distinct values. / A window is valid when the number of distinct values equals k.  
**Approach.** Slide a fixed window of size k maintaining a count map and the sum. When the map has exactly k keys the window is all distinct, so update the best sum. (O(n) time, O(k) space)  
**Edge cases.** k = 1; no valid window; k = n

### Patch the fence
`dc-a-patch-the-fence` · medium · 45 min

A fence is a string of coloured planks (letters). You can repaint at most k planks to any colour. What is the length of the longest stretch of consecutive planks that can be made all one colour?

**Input.** Line 1: the string; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ length ≤ 10^5; uppercase or lowercase letters; 0 ≤ k ≤ length  
**Example.** `xxyzzzy
2` → `5` ("yzzzy" becomes zzzzz with 2 repaints.)  
**Example.** `abcd
0` → `1` (No repaints, so only single planks.)  
**Hints.** A window is fine if length - (count of its most common colour) ≤ k. / The max count never needs to shrink for the window to stay as large as the best seen.  
**Approach.** Slide a window while tracking the highest frequency of any letter seen in it. If window size minus that frequency exceeds k, advance the left end by one. The final window size is the answer. (O(n) time, O(1) extra space)  
**Edge cases.** k ≥ length; k = 0; all same colour

## sorting

### Biggest glued number
`dc-a-biggest-glued-number` · medium · 45 min

Given non-negative integers, glue them together in some order to form the largest possible number (as a string of digits). If the result would be all zeros, print a single 0.

**Input.** One line of n non-negative integers.  
**Output.** The largest concatenation as a string.  
**Constraints.** 1 ≤ n ≤ 10^4; each value ≤ 10^9  
**Example.** `12 121 7` → `712121` (7 first, then 12 before 121 because "12121" > "12112".)  
**Example.** `0 0` → `0` (Zeros collapse to 0.)  
**Hints.** Sorting numerically or by string does not work directly. / Order a before b if a+b is greater than b+a as strings.  
**Approach.** Sort the numbers as strings with a comparator that puts a before b when a+b > b+a, then join them. If the first character is 0 the answer is 0. (O(n log n * L) time, O(n L) space)  
**Edge cases.** all zeros; same prefix numbers like 12 and 121; single number

### Queue jumps
`dc-a-queue-jumps` · medium · 45 min

People in a line have ticket numbers and should be served in increasing order. Count the pairs of people (i, j) with i earlier in line than j but a larger ticket number than j: each such pair is a "jump". Print the total.

**Input.** One line of n integers.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; answer fits in 64-bit  
**Example.** `3 1 2` → `2` ((3,1) and (3,2).)  
**Example.** `4 3 2 1` → `6` (Every pair is out of order: 4+... = 3+2+1.)  
**Hints.** Brute force is O(n^2); think about merge sort. / When merging, an element taken from the right half jumps over everything left in the left half.  
**Approach.** Run merge sort; while merging two sorted halves, whenever the right element is smaller than the current left element, add the number of remaining left elements to the answer. (O(n log n) time, O(n) space)  
**Edge cases.** already sorted; reversed; equal values (not counted)

## stacks

### Days until warmer
`dc-b-next-warmer-day` · medium · 45 min

You have a forecast of daily temperatures. For each day, report how many days you must wait until a strictly warmer day arrives, or 0 if no later day is warmer.

**Input.** One line of integers, the daily temperatures.  
**Output.** One line with n integers, the waiting time for each day.  
**Constraints.** 1 ≤ n ≤ 10^5; temperatures between -50 and 60  
**Example.** `30 40 35 50` → `1 2 1 0` (Day 1 waits 1 day, day 2 waits 2 days, day 3 waits 1, the last never gets warmer.)  
**Example.** `70 60 50 80 90` → `3 2 1 1 0` (The first three days all wait for 80; 80 waits one day for 90; 90 has none.)  
**Hints.** A brute-force scan to the right is too slow for large n; what do days still waiting have in common? / Keep a stack of indices with decreasing temperatures; a new warmer day resolves every smaller index on top.  
**Approach.** Keep a stack of indices whose answers are unknown, with temperatures non-increasing from bottom to top. When a day is warmer than the top, pop it and record the index difference. Each index is pushed and popped once. (O(n) time, O(n) extra space)  
**Edge cases.** Strictly decreasing temperatures; All equal temperatures; Single day

### Tidy the path
`dc-b-tidy-path` · medium · 45 min

Given an absolute file path, simplify it: remove repeated slashes and '.' segments, resolve '..' by going up one folder (staying at the root if already there), and drop any trailing slash. The result must start with a single slash.

**Input.** One line, an absolute path starting with /.  
**Output.** The simplified path.  
**Constraints.** 1 ≤ length ≤ 3000; folder names contain letters, digits, dots (not only dots) and underscores  
**Example.** `/home//docs/./a/../b/` → `/home/docs/b` (Doubled slashes and . are skipped, and .. cancels a, leaving /home/docs/b.)  
**Example.** `/../..` → `/` (Going above the root stays at the root: /.)  
**Hints.** Treat each segment between slashes as an instruction. / Split on /, skip empty and '.', pop for '..', push otherwise; join with / at the end.  
**Approach.** Split by '/', ignore empty and '.' parts, pop the stack on '..' when non-empty, push other names. Join the stack with slashes and prefix a slash. (O(n) time, O(n) extra space)  
**Edge cases.** Only the root /; Many .. at the start; Names like ... that are not special

### Asteroid clash
`dc-b-asteroid-clash` · medium · 45 min

Asteroids drift along a line; the sign gives direction (positive right, negative left) and the absolute value the size, all at equal speed. When two meet head-on the smaller explodes, equal sizes both explode, and same-direction asteroids never meet. Print the survivors in order.

**Input.** One line of non-zero integers.  
**Output.** The surviving asteroids in original order, or EMPTY.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `5 10 -5` → `5 10` (The -5 hits 10 and explodes; 5 and 10 survive.)  
**Example.** `10 2 -5 -12 3` → `-12 3` (-5 kills 2 but dies to 10; -12 kills 10; then 3 drifts right: -12 3.)  
**Hints.** Only a right-mover followed by a left-mover can collide. / Use a stack of survivors; a new left-mover fights the top while the top moves right.  
**Approach.** Push right-movers. For a left-mover, repeatedly compare with the stack top if it is a right-mover: pop smaller tops, destroy both on a tie, or stop if the top is bigger. Push the newcomer if it survives. (O(n) time, O(n) extra space)  
**Edge cases.** All move left; Equal sizes cancel completely; Left-movers first then right-movers

## strings

### Count the mirror pieces
`dc-a-count-mirror-pieces` · medium · 45 min

Count how many substrings of a string are palindromes. Substrings are counted by position, so two equal pieces at different places count separately, and every single character counts.

**Input.** One lowercase string.  
**Output.** One integer.  
**Constraints.** 1 ≤ length ≤ 3000  
**Example.** `aaa` → `6` (a, a, a, aa, aa, aaa.)  
**Example.** `ababa` → `9` (5 singles, aba, bab, aba, and ababa.)  
**Hints.** Every palindrome has a centre: a character or a gap between two characters. / Expand outwards from each of the 2n-1 centres while the ends match.  
**Approach.** For each of the 2n-1 possible centres expand left and right while the characters are equal, counting each successful expansion. The total of all expansions is the answer. (O(n^2) time, O(1) extra space)  
**Edge cases.** all same letters; no repeated letters; length 1

## trees

### Longest hallway
`dc-b-longest-hallway` · medium · 45 min

Rooms form a binary tree and corridors are the edges. Find the length (in corridors) of the longest simple path between any two rooms; it does not have to pass through the root.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** The number of edges on the longest path.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 5` → `3` (The path 4-2-1-3 has 3 edges.)  
**Example.** `1 2 3 4 5 null null 6 null null 7` → `4` (The path 6-4-2-5-7 has 4 edges and avoids the root.)  
**Hints.** A longest path bends at some node; what do you need to know about that node's two sides? / At each node the best bend is height(left) + height(right); track the global maximum while computing heights.  
**Approach.** Compute heights bottom-up. At every node update the answer with left height plus right height (in edges or nodes minus one), then return 1 + max(left, right). (O(n) time, O(h) space)  
**Edge cases.** Single node (0); Longest path avoids the root; Chain

### Shared ancestor
`dc-b-shared-ancestor` · medium · 45 min

In a binary tree with distinct values, the lowest common ancestor of two nodes is the deepest node that has both of them in its subtree (a node counts as being in its own subtree). Given two values that exist in the tree, print their lowest common ancestor.

**Input.** Line 1: the tree in level-order with null. Line 2: two values p and q.  
**Output.** The value of their lowest common ancestor.  
**Constraints.** 2 ≤ n ≤ 10^4; values distinct  
**Example.** `1 2 3 4 5 6 7
4 5` → `2` (Both live under node 2, and 2 is their deepest shared ancestor.)  
**Example.** `1 2 3 4 5 6 7
4 7` → `1` (4 is under the left child and 7 under the right child, so the split happens at the root: 1.)  
**Hints.** Where could the answer be if p is found on the left and q on the right of some node? / Recurse: return the node if it equals p or q; if both sides return something, the current node is the answer, else return the non-empty side.  
**Approach.** DFS returns a node when it matches p or q, otherwise combines child results. The first node where both children return non-null is the LCA; if only one does, bubble that result up. (O(n) time, O(h) space)  
**Edge cases.** One value is an ancestor of the other; Both values in the same subtree; p equals the root

### Zigzag floors
`dc-b-zigzag-floors` · medium · 45 min

Walk a binary tree level by level, but alternate direction: the first level left to right, the second right to left, the third left to right again, and so on. Print each level on its part of the line, separated by ' | '.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** Levels in zigzag order, separated by ' | '.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 5 6 7` → `1 | 3 2 | 4 5 6 7` (Level 1 is reversed to 3 2; levels 0 and 2 read left to right.)  
**Example.** `1 2 null 3` → `1 | 2 | 3` (Single-node levels look the same in either direction.)  
**Hints.** Start from a normal level-order traversal. / Reverse every odd-numbered level (or use a deque and append left/right alternately).  
**Approach.** Do a BFS by levels and keep a flag toggling after each level; reverse the level's values when the flag says right-to-left. (O(n) time, O(w) space)  
**Edge cases.** Single node; Chain; Perfect tree

### Even keel
`dc-b-even-keel` · medium · 45 min

A binary tree is height-balanced if, for every node, the heights of its left and right subtrees differ by at most 1. Decide whether the given tree is height-balanced, ideally in a single traversal.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** true or false.  
**Constraints.** 0 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 5` → `true` (Every node's subtree heights differ by at most 1.)  
**Example.** `1 2 3 4 null null 5 6` → `false` (Node 2 has a left subtree of height 2 and nothing on the right.)  
**Hints.** Computing height separately for every node is O(n^2) in the worst case. / Return the height from a recursive call, using -1 as a signal that a subtree is already unbalanced.  
**Approach.** Post-order DFS returns the subtree height or -1 if unbalanced. If either child returns -1 or the heights differ by more than 1, propagate -1. (O(n) time, O(h) space)  
**Edge cases.** Empty tree; Long chain; Unbalanced deep in one subtree

## two-pointers

### Balanced trios
`dc-a-balanced-trio` · medium · 45 min

Each item in a list has a signed weight. Count the distinct value-triples (a, b, c) that can be picked from three different positions and add up to zero. Triples with the same three values count once, no matter the order or which positions were used.

**Input.** One line of n integers.  
**Output.** One integer.  
**Constraints.** 3 ≤ n ≤ 2000; |values| ≤ 10^5  
**Example.** `-2 0 1 1 2 -2` → `2` ((-2,0,2) and (-2,1,1).)  
**Example.** `0 0 0 0` → `1` (Only (0,0,0), though many position choices exist.)  
**Hints.** Sort first, fix the smallest element, and search for the other two with two pointers. / Skip duplicate values for the fixed element and after finding a trio.  
**Approach.** Sort the array. For each index i (skipping repeated values), run left/right pointers over the rest: move left up when the sum is too small, right down when too large, and record and skip duplicates on a hit. (O(n^2) time, O(1) extra space besides sorting)  
**Edge cases.** all zeros; no trio; many duplicates

### At most twice
`dc-a-at-most-twice` · medium · 45 min

A sorted list of tags may repeat values many times. Edit it so that each value appears at most twice, keeping the order, and print the resulting list.

**Input.** One line of n sorted integers.  
**Output.** The reduced list.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 1 1 2 2 3` → `1 1 2 2 3` (The third 1 is dropped.)  
**Example.** `4 4 4 4` → `4 4` (Only two 4s survive.)  
**Hints.** Compare the candidate with the element two places back in the kept list. / If they are equal, a third copy would appear, so skip it.  
**Approach.** Keep a write index k. For each element x, if k < 2 or x differs from the element at position k-2 of the kept part, write it and increment k. (O(n) time, O(1) extra space)  
**Edge cases.** n = 1 or 2; one value repeated; no duplicates

## union-find

### Accounts of the same person
`dc-c-same-person-accounts` · medium · 45 min

A website has k accounts, and each account lists some email addresses. Two accounts belong to the same person if they share at least one address, and this extends through chains of such sharing. Count the number of distinct people.

**Input.** First line k, then k lines each with a count c followed by c email strings without spaces.  
**Output.** One integer: the number of distinct people.  
**Constraints.** 1 ≤ k ≤ 10^4; total emails ≤ 10^5  
**Example.** `4
2 a@x b@x
1 b@x
1 c@x
2 c@x d@x` → `2` (Accounts 1,2 share b@x; accounts 3,4 share c@x.)  
**Example.** `3
1 p@y
1 q@y
0` → `3` (No shared emails, so three people.)  
**Hints.** Use a map from email to the first account that listed it. / Whenever an email is seen again, union the two accounts.  
**Approach.** Union-find over accounts plus a hash map email -> account index; union with the stored account on every repeat. The answer is the set count. (O(E α(k)) time, O(E) space)  
**Edge cases.** Account with no emails; Same email twice in one account; Long chain of sharing

### Islands rising from the sea
`dc-c-rising-islands` · medium · 45 min

A sea is an R by C grid, initially all water. Land rises one cell at a time. After each event, report the number of islands, where land cells joined along sides form one island. An event may name a cell that is already land, in which case nothing changes.

**Input.** First line R C q, then q lines each with a 1-indexed cell r c.  
**Output.** q space-separated integers: the island count after each event.  
**Constraints.** 1 ≤ R·C ≤ 10^5; 1 ≤ q ≤ 10^5  
**Example.** `3 3 4
1 1
3 3
2 2
1 2` → `1 2 3 2` (Counts 1, 2, 3; then (1,2) bridges (1,1) and (2,2), leaving 2.)  
**Example.** `2 2 3
1 1
1 1
2 2` → `1 1 2` (Duplicate event is ignored; diagonal cells stay separate.)  
**Hints.** Offline BFS after each step is too slow. / Add the new cell as an island (+1), then every successful union with a land neighbor removes one.  
**Approach.** Keep a union-find over cells and a land set. On adding a cell, increase the count, then for each of 4 land neighbors perform a union and decrement the count if it merged different sets. (O(q α(RC)) time, O(RC) space)  
**Edge cases.** Repeated land cell; Cell that merges four islands; 1x1 grid

### Cheapest way to wire the town
`dc-c-cheapest-network` · medium · 45 min

A town has n houses and m possible cables, each joining two houses at a given price. Choose a set of cables that connects every house to every other (directly or via others) with the smallest total price. Print that price, or -1 if connecting everything is impossible.

**Input.** First line n m, then m lines each with a possible cable a b w.  
**Output.** The minimum total price, or -1.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; 1 ≤ w ≤ 10^6  
**Example.** `4 5
1 2 3
2 3 1
1 3 2
3 4 5
2 4 9` → `8` (Take 1 (2-3), 2 (1-3) and 5 (3-4): total 8.)  
**Example.** `3 1
1 2 4` → `-1` (House 3 can never be connected.)  
**Hints.** Sort cables by price and take cheap ones that do not form a loop. / Union-find rejects a cable whose ends are already connected.  
**Approach.** Kruskal's algorithm: sort edges by weight, add each edge whose endpoints are in different sets, and sum weights. If fewer than n-1 edges were added, output -1. (O(m log m) time, O(n) space)  
**Edge cases.** n = 1 (cost 0); Disconnected houses; Equal-priced cables

### Are the claims consistent
`dc-c-equation-check` · medium · 45 min

You are given claims about single-letter variables, each of the form a==b or a!=b. Decide whether all claims can be true at the same time for some assignment of values to the variables.

**Input.** First line k, then k lines each with a claim of exactly four characters like a==b or c!=d.  
**Output.** YES if the claims are consistent, otherwise NO.  
**Constraints.** 1 ≤ k ≤ 10^4; variables are lowercase letters  
**Example.** `3
a==b
b==c
a!=c` → `NO` (a equals c through b, but a!=c contradicts it.)  
**Example.** `2
a==b
b!=c` → `YES` (c can simply differ from the pair.)  
**Hints.** Equalities create groups; first handle only the == claims. / Then every != claim must connect two different groups.  
**Approach.** Union all letters from == claims, then check each != claim: if both letters share a root the system is contradictory. Otherwise it is satisfiable. (O(k α(26)) time, O(1) space)  
**Edge cases.** a!=a; Order of claims shouldn't matter; Only != claims

### Words that share letters
`dc-c-shared-letters` · medium · 45 min

A list of lowercase words is split into families: two words are in the same family if they share at least one letter, directly or through a chain of other words. Count the families.

**Input.** First line k, then k lines each with one non-empty lowercase word.  
**Output.** One integer: the number of families.  
**Constraints.** 1 ≤ k ≤ 10^4; each word length ≤ 50  
**Example.** `4
abc
cde
xyz
zzq` → `2` (abc-cde share c; xyz-zzq share z.)  
**Example.** `3
ab
ba
c` → `2` (ab and ba share letters; c stands alone.)  
**Hints.** Comparing every pair of words is O(k²) pairs; avoid it. / Treat the 26 letters as extra nodes and attach each word to its letters.  
**Approach.** Create a union-find over 26 letters plus k words; union each word with every distinct letter it contains. Count distinct roots among word nodes. (O(total length · α) time, O(k) space)  
**Edge cases.** All words identical; No overlaps at all; Single-letter words


# Weekly medium: builds (250)

## ai

### Chunking strategy ablation
`ai-chunking-ablation` · Y1-P0 · level 2 · 4 h · Python, embedding model, vector store

**Goal.** A study of chunk size, overlap and splitting rules on retrieval quality.  
**Approach.** Prepare a corpus and 40 questions with source passages → Sweep chunk sizes and overlaps → Measure hit rate of the correct passage  
**Done when.** Heatmap of hit@5 over size and overlap and a recommended setting.  
**Measure.** Hit@5 per setting  
**Pitfalls.** Chunks that split answers across boundaries; Changing the embedding model mid-sweep  

### Tabular model bakeoff with proper CV
`ai-tabular-model-bakeoff` · Y1-P0 · level 2 · 5 h · Python, scikit-learn, LightGBM

**Goal.** Linear, forest and boosting models compared with nested cross-validation.  
**Approach.** Choose a public tabular dataset → Build leak-free pipelines → Tune with nested CV → Compare with confidence intervals  
**Done when.** A report with CV scores and intervals and a statement on whether differences are significant.  
**Measure.** Mean CV score and 95% interval  
**Pitfalls.** Tuning on the outer fold; Target leakage in features  

### Voice memo to transcript to summary pipeline
`ai-voice-memo-pipeline` · Y1-P0 · level 2 · 5 h · Python, Whisper-class ASR, LLM API

**Goal.** A script that turns audio files into transcripts and structured summaries.  
**Approach.** Transcribe 10 recordings → Summarize into action items with a schema → Measure word error rate on 3 hand-corrected transcripts  
**Done when.** Pipeline processes a folder end to end and reports WER on the checked samples.  
**Measure.** Word error rate  
**Pitfalls.** Long audio exceeding model limits; Judging summaries by eye only  

### Building a regression eval set from app logs
`ai-eval-set-from-logs` · Y1-P0 · level 2 · 4 h · Python, JSONL, LLM API

**Goal.** A script that samples real prompts, labels them and freezes a regression set with pass/fail scoring.  
**Approach.** Log prompts and outputs from a small app → Sample and label 50 cases → Write a runner that scores a new prompt version  
**Done when.** Runner flags a deliberately degraded prompt as a regression on the set.  
**Measure.** Pass rate for good vs degraded prompt  
**Pitfalls.** Sampling only easy cases; Labels not versioned  

### BM25 versus dense versus hybrid retrieval benchmark
`ai-hybrid-retrieval-benchmark` · Y1-P0 · level 3 · 5 h · Python, sentence-transformers, rank_bm25

**Goal.** A benchmark comparing three retrievers with reciprocal rank fusion on a labeled query set.  
**Approach.** Build a 50-query labeled set over a document corpus → Index with BM25 and dense embeddings → Add reciprocal rank fusion → Report recall@k and MRR  
**Done when.** Table of recall@5 and MRR for all three, with a failure-case analysis of 5 queries.  
**Measure.** Recall@5 and MRR  
**Pitfalls.** Labels derived from the same model being tested; Tiny query set  

### LLM-as-judge agreement with human labels
`ai-llm-judge-agreement` · Y1-P0 · level 3 · 5 h · Python, LLM API

**Goal.** A calibration of an LLM judge against 100 hand-labeled answers.  
**Approach.** Hand-label 100 answers on a rubric → Run the judge with two prompt variants → Compute Cohen kappa and bias toward length  
**Done when.** Report kappa for each prompt and whether the judge prefers longer answers.  
**Measure.** Cohen kappa and length correlation  
**Pitfalls.** Labeling after seeing judge outputs; Position bias in pairwise judging  

### FastAPI model service with load test
`ai-fastapi-model-service` · Y1-P0 · level 3 · 6 h · FastAPI, Docker, locust or wrk

**Goal.** A containerized model endpoint with validation, health check and a load-test report.  
**Approach.** Wrap a scikit-learn or small torch model → Add pydantic validation and health route → Containerize → Load test and find the saturation point  
**Done when.** Service sustains a stated requests/s at p95 under a target latency in a documented test.  
**Measure.** Requests/s and p95 latency  
**Pitfalls.** Loading the model per request; Single worker saturating CPU  

### Semantic cache for LLM calls
`ai-semantic-cache` · Y1-P0 · level 3 · 5 h · Python, embeddings, SQLite

**Goal.** A cache that returns stored answers for near-duplicate questions with a tunable threshold.  
**Approach.** Embed and store query-answer pairs → Lookup by cosine threshold → Evaluate hit rate and wrong-hit rate on paraphrases  
**Done when.** Chart of hit rate versus wrong-answer rate across thresholds.  
**Measure.** Hit rate and false-hit rate  
**Pitfalls.** Threshold too lax returns wrong answers; Caching personalized answers  

### Text-to-SQL with execution accuracy
`ai-text-to-sql-lite` · Y1-P0 · level 3 · 6 h · Python, SQLite, LLM API

**Goal.** A schema-aware text-to-SQL tool scored by executing results against gold queries.  
**Approach.** Pick a sample database and write 40 question/SQL pairs → Prompt with schema and examples → Execute and compare result sets → Add repair-on-error  
**Done when.** Execution accuracy reported before and after the repair loop.  
**Measure.** Execution accuracy  
**Pitfalls.** Order-sensitive result comparison; Running generated SQL with write access  

### Permutation importance versus SHAP
`ai-importance-permutation-shap` · Y1-P0 · level 3 · 4 h · Python, scikit-learn, shap

**Goal.** A comparison of two importance methods on correlated features.  
**Approach.** Train a boosted model on a dataset with correlated features → Compute both importances → Perturb correlated pairs and observe disagreements  
**Done when.** Written conclusion backed by a plot showing where the methods diverge.  
**Measure.** Rank correlation between methods  
**Pitfalls.** Permuting correlated features understates importance; Explaining on training data  

### Config-driven experiment tracking
`ai-experiment-tracking-config` · Y1-P1 · level 2 · 5 h · Python, Hydra-style configs, MLflow or SQLite

**Goal.** A training template where every run is defined by config and logged with git hash and metrics.  
**Approach.** Move hyperparameters to YAML → Log metrics, config and commit → Write a compare-runs script  
**Done when.** Any past run can be reproduced from its logged config to the same metric within noise.  
**Measure.** Metric difference on reproduction  
**Pitfalls.** Dirty working tree not recorded; Unseeded data order  

### ASR robustness to noise
`ai-asr-noise-robustness` · Y1-P1 · level 2 · 4 h · Python, Whisper-class model, audio libs

**Goal.** A WER-versus-SNR curve for speech recognition under added noise.  
**Approach.** Collect or generate clean speech samples → Mix noise at 5 SNR levels → Compute WER at each  
**Done when.** Curve of WER versus SNR for two model sizes.  
**Measure.** WER per SNR level  
**Pitfalls.** Normalizing text inconsistently; Clipping after mixing  

### ResNet on CIFAR ablation study
`ai-resnet-cifar-ablation` · Y1-P1 · level 3 · 7 h · PyTorch

**Goal.** A small ResNet with ablations of skip connections, depth and augmentation.  
**Approach.** Implement a ResNet-20 style net → Train with and without skips → Add augmentation ablations → Plot results with 3 seeds  
**Done when.** Table of accuracy mean and std for each variant.  
**Measure.** Test accuracy mean and std  
**Pitfalls.** Single seed conclusions; Data leakage between train and val  

### Char LSTM versus tiny transformer
`ai-lstm-vs-transformer-char` · Y1-P1 · level 3 · 6 h · PyTorch

**Goal.** Two char-level models trained on the same text at matched parameter counts.  
**Approach.** Build both models → Match parameters within 5% → Train on the same data and budget → Compare loss and samples  
**Done when.** Loss curves versus tokens and wall-clock for both models.  
**Measure.** Validation bits per character  
**Pitfalls.** Unmatched compute budget; Different tokenization  

### MCP server for read-only SQL
`ai-mcp-readonly-sql-server` · Y1-P1 · level 3 · 5 h · Python, MCP SDK, SQLite or Postgres

**Goal.** An MCP server exposing schema and query tools with safe read-only enforcement.  
**Approach.** Expose schema as resources → Add a query tool with parsing and row limits → Test with an LLM client on 15 questions  
**Done when.** All 15 questions answered and 5 malicious write attempts blocked.  
**Measure.** Blocked attempts and answer accuracy  
**Pitfalls.** String checks instead of a read-only connection; Unbounded result sizes  

### Planner and critic agents with cost accounting
`ai-planner-critic-agents` · Y1-P1 · level 3 · 6 h · Python, LLM API

**Goal.** A two-role agent pair compared against a single agent on cost and quality.  
**Approach.** Implement planner, executor and critic prompts → Run on 20 tasks → Track tokens and success for both setups  
**Done when.** Report whether the critic improved success per dollar.  
**Measure.** Success rate per dollar  
**Pitfalls.** Critic that always approves; Unfair prompts between setups  

### Cross-encoder reranker over retrieval
`ai-cross-encoder-reranker` · Y1-P1 · level 3 · 5 h · Python, sentence-transformers

**Goal.** A second-stage reranker evaluated for accuracy and latency tradeoff.  
**Approach.** Retrieve top-50 with a bi-encoder → Rerank with a cross-encoder → Measure nDCG@10 and added latency  
**Done when.** nDCG improves over first stage and latency cost is quantified.  
**Measure.** nDCG@10 gain and ms per query  
**Pitfalls.** Reranking too many candidates; Evaluation set overlap with fine-tuning data  

### LoRA fine-tune versus prompting for classification
`ai-lora-classifier-vs-prompt` · Y1-P1 · level 3 · 7 h · PyTorch, PEFT, small LLM

**Goal.** A comparison of few-shot prompting and a LoRA fine-tune on a labeled task.  
**Approach.** Pick a 3-class text task → Few-shot prompt baseline → LoRA fine-tune on 500 examples → Compare accuracy, cost and latency  
**Done when.** Table with accuracy, latency and training cost for both methods.  
**Measure.** Accuracy and cost per 1k predictions  
**Pitfalls.** Evaluating on training prompts; Rank and alpha mismatches  

### Small ViT on CIFAR versus CNN
`ai-vit-small-cifar` · Y1-P1 · level 3 · 7 h · PyTorch

**Goal.** A patch-based vision transformer trained from scratch and compared to a CNN.  
**Approach.** Implement patch embedding and encoder → Train with augmentation → Compare to a CNN baseline → Visualize attention maps  
**Done when.** ViT and CNN accuracy at equal compute reported with attention visualization.  
**Measure.** Test accuracy at equal FLOPs  
**Pitfalls.** ViTs underperform on small data without augmentation; Patch size too large  

### Knowledge distillation teacher to student
`ai-knowledge-distillation` · Y1-P1 · level 3 · 6 h · PyTorch

**Goal.** A large model's knowledge distilled into a small one with temperature-scaled soft targets.  
**Approach.** Train a teacher → Train a student alone as baseline → Train with distillation loss → Sweep temperature  
**Done when.** Distilled student beats the baseline student at the same size.  
**Measure.** Accuracy gain over baseline  
**Pitfalls.** Teacher overfit; Wrong temperature scaling of gradients  

### Agent with long-term memory and eval
`ai-agent-long-term-memory` · Y1-P1 · level 3 · 7 h · Python, LLM API, SQLite or vector store

**Goal.** An assistant that stores and retrieves facts across sessions, tested on recall tasks.  
**Approach.** Design memory write and read policies → Implement summarization and retrieval → Create 20 multi-session test conversations  
**Done when.** Recall accuracy over the test set with and without memory.  
**Measure.** Recall accuracy delta  
**Pitfalls.** Storing everything; Stale contradictory memories  

### CLIP semantic photo search
`ai-clip-photo-search` · Y1-P1 · level 3 · 5 h · Python, CLIP model, FAISS-like index

**Goal.** Natural-language search over a folder of images with a quality evaluation.  
**Approach.** Embed 1000 images → Search by text and image → Label 30 queries and measure precision@5  
**Done when.** Search UI or CLI returns relevant images with precision@5 reported.  
**Measure.** Precision@5  
**Pitfalls.** Large images slowing indexing; Bias in handmade queries  

### DCGAN and mode collapse analysis
`ai-dcgan-mode-collapse` · Y1-P1 · level 3 · 7 h · PyTorch

**Goal.** A DCGAN on a small dataset with diagnostics for mode collapse and a stabilization trick.  
**Approach.** Train a baseline DCGAN → Count modes with a classifier → Apply spectral norm or label smoothing → Compare diversity  
**Done when.** Mode coverage metric reported before and after the fix.  
**Measure.** Mode coverage and diversity  
**Pitfalls.** Discriminator overpowering generator; Judging only by eye  

### Near-duplicate detection with MinHash LSH
`ai-minhash-dedup` · Y2 · level 3 · 5 h · Python, datasketch-style implementation

**Goal.** A dedup pipeline for a text corpus with measured precision and recall of duplicates.  
**Approach.** Shingle documents → Implement MinHash and banding → Inject known duplicates and measure recovery  
**Done when.** Recall above 90% on injected near-duplicates at a stated false-positive rate.  
**Measure.** Recall and false-positive rate  
**Pitfalls.** Band count misconfigured; Memory blowup on large corpora  

### Reward model from preference pairs
`ai-bradley-terry-reward-model` · Y2 · level 3 · 6 h · PyTorch

**Goal.** A Bradley-Terry reward model trained on pairwise preferences with an accuracy check.  
**Approach.** Build a preference dataset → Train a scalar-head model → Evaluate pairwise accuracy and best-of-n lift  
**Done when.** Held-out pairwise accuracy above 70% and best-of-n improves a proxy score.  
**Measure.** Pairwise accuracy  
**Pitfalls.** Length bias; Overfitting to annotator noise  

### Find the bottleneck with the PyTorch profiler
`ai-torch-profiler-bottleneck` · Y2 · level 3 · 4 h · PyTorch profiler, TensorBoard or Chrome trace

**Goal.** A profiled training loop with three optimizations applied and quantified.  
**Approach.** Profile a baseline step → Identify top ops and idle gaps → Apply fixes such as fused ops and pinned memory  
**Done when.** Step time reduced by at least 25% with a trace comparison.  
**Measure.** Step time before and after  
**Pitfalls.** Profiling the warmup; Optimizing the wrong op  

### Prompt caching and agent cost reduction
`ai-agent-cost-caching` · Y2 · level 3 · 4 h · Python, LLM API

**Goal.** A study of cost savings from prompt caching and context pruning in a tool-using agent.  
**Approach.** Log tokens per step for 20 tasks → Reorder prompts for cacheable prefixes → Prune stale tool outputs  
**Done when.** Cost per task falls by a stated percentage with success unchanged.  
**Measure.** Cost per task and success rate  
**Pitfalls.** Cache-busting timestamps in prefixes; Pruning needed context  

### Data drift monitor with PSI and KS tests
`ai-drift-monitor` · Y2 · level 3 · 5 h · Python, SciPy, pandas

**Goal.** A monitor that detects injected drift in feature streams and raises alerts.  
**Approach.** Simulate a stream with gradual and sudden shifts → Compute PSI and KS per feature → Tune thresholds on alert precision  
**Done when.** Detects injected drift within a stated delay with few false alarms.  
**Measure.** Detection delay and false-alarm rate  
**Pitfalls.** Multiple-testing false alarms; Window size too small  

### Reproducible ML pipeline with data versioning
`ai-dvc-reproducible-pipeline` · Y2 · level 3 · 6 h · DVC-style tooling, Git, Python

**Goal.** A pipeline where data, code and params are versioned and a run is reproducible from a clean clone.  
**Approach.** Define stages for prep, train, eval → Track data with a remote store → Reproduce on a fresh checkout  
**Done when.** A clean-clone reproduction yields identical metrics.  
**Measure.** Metric equality after reproduction  
**Pitfalls.** Nondeterministic stages; Large files committed to Git  

### Post-training int8 quantization study of a CNN
`ai-int8-quantization-study` · Y2 · level 3 · 6 h · PyTorch, ONNX Runtime or torch.ao

**Goal.** Static and dynamic int8 quantization compared on accuracy, size and CPU latency.  
**Approach.** Train a baseline CNN → Apply dynamic and static PTQ with calibration → Measure size, accuracy and latency → Try per-channel versus per-tensor  
**Done when.** Model is at least 3x smaller with under 1 point accuracy loss, or the loss source is explained.  
**Measure.** Size ratio, accuracy delta, latency  
**Pitfalls.** Calibration data unrepresentative; Fake-quant timings mistaken for real speed  

### QLoRA instruction tune of a 1-3B model
`ai-qlora-instruction-tune` · Y2 · level 4 · 8 h · PyTorch, PEFT, bitsandbytes, single GPU

**Goal.** A 4-bit QLoRA fine-tune with before/after evaluation on a held-out task.  
**Approach.** Prepare 2k instruction pairs → Fine-tune in 4-bit with LoRA → Evaluate against base with a rubric and a judge → Track memory use  
**Done when.** Fine-tuned model wins more than 60% of pairwise comparisons on held-out prompts.  
**Measure.** Win rate and peak GPU memory  
**Pitfalls.** Training on the eval prompts; Wrong chat template  

### DDP scaling efficiency study
`ai-ddp-scaling-efficiency` · Y2 · level 4 · 6 h · PyTorch DDP, 2+ GPUs or CPU gloo

**Goal.** A measurement of scaling efficiency from 1 to N processes with communication analysis.  
**Approach.** Train with DDP at N=1,2,4 or simulated → Measure throughput → Profile all-reduce time → Test gradient bucket size  
**Done when.** Scaling efficiency table with the identified bottleneck.  
**Measure.** Throughput scaling efficiency  
**Pitfalls.** Global versus per-device batch confusion; Unfixed seeds across ranks  

### Autoregressive image model with masked convolutions
`ai-pixelcnn-autoregressive` · Y2 · level 4 · 7 h · PyTorch

**Goal.** A PixelCNN-style model trained on binarized digits with likelihood evaluation and sampling.  
**Approach.** Implement masked convolutions → Train on binarized MNIST → Sample pixel by pixel → Report bits per dimension  
**Done when.** Samples are recognizable digits and bits/dim is reported against a baseline.  
**Measure.** Bits per dimension  
**Pitfalls.** Blind spot from naive masking; Slow sampling loops  

### Speech commands classifier on spectrograms
`ai-speech-commands-cnn` · Y3 · level 3 · 5 h · PyTorch, torchaudio

**Goal.** A keyword classifier with mel spectrograms and SpecAugment.  
**Approach.** Compute log-mel features → Train a small CNN → Apply SpecAugment → Analyze confusions  
**Done when.** Accuracy above 90% on a 10-word subset with a confusion matrix.  
**Measure.** Accuracy and top confusions  
**Pitfalls.** Speaker overlap between splits; Inconsistent audio lengths  

### Failure taxonomy of 100 agent traces
`ai-agent-trace-taxonomy` · Y3 · level 3 · 6 h · Python, LLM API, spreadsheet

**Goal.** A labeled taxonomy of why a tool agent fails, with fixes tested on the top causes.  
**Approach.** Collect 100 traces from your agent → Hand-label failure modes → Fix the top two causes and rerun  
**Done when.** Failure rate drops after targeted fixes, with taxonomy counts reported.  
**Measure.** Failure rate before and after  
**Pitfalls.** Labels drift as you read; Fixing rare causes first  

### Behavior cloning versus DAgger
`ai-bc-vs-dagger` · Y3 · level 3 · 6 h · PyTorch, Gymnasium

**Goal.** A comparison showing compounding error in cloning and its fix with expert relabeling.  
**Approach.** Collect expert demos → Train a cloned policy → Iterate DAgger rounds → Compare returns  
**Done when.** DAgger outperforms cloning at equal data with a plotted gap.  
**Measure.** Return vs demo count  
**Pitfalls.** Expert queried too costly; Distribution mismatch ignored  

### GRPO on verifiable arithmetic
`ai-grpo-arithmetic-tiny` · Y3 · level 4 · 8 h · PyTorch, small LM, custom verifier

**Goal.** Group-relative policy optimization applied to a small model with an automatic reward.  
**Approach.** Generate arithmetic prompts with a verifier → Sample groups and compute relative advantages → Update with a KL penalty → Track pass rate  
**Done when.** Pass rate on held-out problems rises measurably over the base model.  
**Measure.** Pass@1 before and after  
**Pitfalls.** Reward hacking of formatting; Group size too small  

### VQ-VAE image tokenizer
`ai-vqvae-image-tokenizer` · Y3 · level 4 · 8 h · PyTorch

**Goal.** A discrete image tokenizer with codebook usage diagnostics.  
**Approach.** Implement encoder, quantizer, decoder → Add EMA codebook updates → Track codebook utilization → Reconstruct held-out images  
**Done when.** Reconstruction PSNR and over 50% codebook utilization.  
**Measure.** PSNR and codebook perplexity  
**Pitfalls.** Codebook collapse; Missing straight-through gradient  

### JEPA-style predictive representation on moving digits
`ai-jepa-moving-digits` · Y3 · level 4 · 8 h · PyTorch

**Goal.** A latent-prediction model on short moving-digit clips with a linear probe.  
**Approach.** Generate moving MNIST clips → Train context and target encoders with EMA → Predict latent of masked future → Linear-probe digit class  
**Done when.** Linear probe accuracy beats a randomly initialized encoder by a stated margin.  
**Measure.** Probe accuracy vs random  
**Pitfalls.** Representation collapse; Probe overfitting  

### SimCLR contrastive pretraining on small images
`ai-simclr-contrastive` · Y3 · level 4 · 7 h · PyTorch

**Goal.** Self-supervised pretraining evaluated with a linear probe and an augmentation ablation.  
**Approach.** Implement NT-Xent loss → Pretrain with strong augmentations → Ablate crop and color → Linear-probe  
**Done when.** Probe accuracy table across augmentation settings.  
**Measure.** Linear probe accuracy  
**Pitfalls.** Small batches weaken negatives; Weak augmentations  

### Finding induction heads
`ai-induction-heads` · Y3 · level 4 · 7 h · PyTorch, small transformer

**Goal.** Evidence of induction behavior in a small trained transformer.  
**Approach.** Train a 2-layer attention-only model on repeated random sequences → Measure in-context loss improvement → Locate heads by attention pattern and ablate them  
**Done when.** Ablating identified heads removes the repeated-sequence advantage.  
**Measure.** Loss on repeat before and after ablation  
**Pitfalls.** Training not long enough for the phase change; Misidentifying heads from one example  

### SAC on a continuous control task
`ai-sac-continuous-control` · Y3 · level 4 · 8 h · PyTorch, Gymnasium MuJoCo or Pendulum

**Goal.** A soft actor-critic implementation with learning curves and entropy tuning ablation.  
**Approach.** Implement twin critics and squashed Gaussian policy → Train on Pendulum then a harder task → Toggle automatic entropy tuning  
**Done when.** Solves Pendulum and shows the ablation across 3 seeds.  
**Measure.** Return curves over seeds  
**Pitfalls.** Wrong log-prob correction for tanh; Replay buffer warmup  

### Gesture recognition from IMU with a small recurrent net
`ai-imu-gesture-lstm` · Y4 · level 3 · 6 h · PyTorch, microcontroller or phone IMU logs

**Goal.** A gesture classifier trained on self-recorded IMU data with an on-device size budget.  
**Approach.** Record 5 gestures with 30 samples each → Train a GRU or 1D CNN → Quantize and check parameter count  
**Done when.** Held-out accuracy above 90% with a model under 20k parameters.  
**Measure.** Accuracy and parameter count  
**Pitfalls.** Window leakage; Person-specific overfitting  

### Keyword spotting on a microcontroller
`ai-tinyml-keyword-mcu` · Y4 · level 4 · 8 h · TensorFlow Lite Micro or similar, Cortex-M board

**Goal.** An int8 keyword model running on an MCU with latency and RAM measurements.  
**Approach.** Train a small keyword model → Quantize to int8 → Deploy and time inference on device → Check RAM and flash use  
**Done when.** On-device accuracy within 3 points of host and inference under 100 ms.  
**Measure.** Latency ms, RAM bytes, accuracy gap  
**Pitfalls.** Feature extraction mismatch between host and device; Stack overflows  

### Neural surrogate for beam deflection
`ai-surrogate-beam-fea` · Y5 · level 4 · 6 h · PyTorch, FEA or analytic beam data

**Goal.** A small network predicting deflection from geometry and load, validated against FEA.  
**Approach.** Generate 2k beam cases with a solver → Train an MLP surrogate → Test extrapolation outside training ranges  
**Done when.** Interpolation error under 2% and extrapolation failure documented.  
**Measure.** Mean relative error in and out of range  
**Pitfalls.** Trusting extrapolation; Unnormalized inputs spanning orders of magnitude  

## graphics

### Software raycaster maze walker
`gfx-raycaster-maze-software` · Y1-P0 · level 2 · 4 h · C or Python, SDL2/pygame

**Goal.** A first-person grid maze rendered by casting one ray per column with DDA and textured walls.  
**Approach.** Implement DDA grid traversal → Compute wall height with fisheye correction → Add textures and minimap  
**Done when.** Walk a 24x24 maze at 60 FPS with no fisheye distortion.  
**Measure.** Frame time at 800x600  
**Pitfalls.** Fisheye from Euclidean distance; Texture column off-by-one  

### Game of Life on the GPU via ping-pong textures
`gfx-life-shader-pingpong` · Y1-P0 · level 2 · 3 h · OpenGL, GLSL

**Goal.** Conway's Life at 2048x2048 stepped in a fragment shader with painting by mouse.  
**Approach.** Two floating framebuffers swapped each step → Neighbour count with texelFetch → Add mouse brush and rule variants  
**Done when.** Runs 2048x2048 at 60 steps/s and matches a CPU reference for 100 generations.  
**Measure.** Cells updated per second  
**Pitfalls.** Reading and writing same texture; Wrap mode errors at borders  

### 2D sprite batcher with texture atlas
`gfx-sprite-batch-2d` · Y1-P0 · level 2 · 5 h · C++ or Python, OpenGL

**Goal.** A batched 2D renderer drawing 50k sprites per frame from an atlas with rotation and tint.  
**Approach.** Build dynamic vertex buffer → Pack sprites into an atlas → Flush batches on texture change  
**Done when.** 50k sprites at 60 FPS using under 20 draw calls.  
**Measure.** Sprites per frame at 60 FPS  
**Pitfalls.** Per-sprite draw calls; Atlas bleeding at edges  

### CPU particle system with emitters and curves
`gfx-cpu-particle-emitter` · Y1-P0 · level 2 · 4 h · C++ or Python, OpenGL

**Goal.** Fire, smoke and spark presets driven by lifetime curves and additive blending.  
**Approach.** Pool particles in a struct-of-arrays → Sample size and colour over life → Render as point sprites or quads  
**Done when.** Three presets run with 100k live particles at 60 FPS.  
**Measure.** Max particles at 60 FPS  
**Pitfalls.** Sorting needed for alpha blend; Allocation per particle  

### OBJ loader with orbit camera and normals
`gfx-obj-loader-orbit-viewer` · Y1-P0 · level 2 · 3 h · C++ or Python, OpenGL

**Goal.** A mesh viewer that loads OBJ, indexes and de-duplicates vertices, and computes missing normals.  
**Approach.** Parse v/vt/vn/f incl. polygons → Deduplicate with a hash map → Orbit and zoom controls  
**Done when.** Loads a 1M-triangle model in under 2 s and renders it with smooth normals.  
**Measure.** Load time and vertex count after dedup  
**Pitfalls.** Negative OBJ indices; Fan triangulation of concave polygons  

### Interactive 2D/3D vector field visualiser
`gfx-vector-field-viewer` · Y1-P0 · level 2 · 4 h · Python, NumPy, matplotlib or WebGL

**Goal.** Streamlines, arrows and LIC for user-entered field expressions.  
**Approach.** Parse expressions safely → Integrate streamlines with RK4 → Render arrows and colour by magnitude  
**Done when.** Dipole and vortex presets display correct topology including critical points.  
**Measure.** Streamlines per second  
**Pitfalls.** Eval of unsafe input; Streamlines escaping domain  

### Mandelbrot and Julia explorer with deep zoom
`gfx-mandelbrot-zoom-shader` · Y1-P0 · level 3 · 3 h · GLSL, OpenGL

**Goal.** An interactive fractal viewer with smooth colouring and a double-single precision trick to zoom past float limits.  
**Approach.** Escape-time iteration with smooth colour → Pan/zoom controls → Implement double-single arithmetic  
**Done when.** Zoom reaches about 1e-12 scale before visible blockiness, versus 1e-6 with plain float.  
**Measure.** Max usable zoom  
**Pitfalls.** Compiler fusing double-single ops away; Iteration count too low at depth  

### Ray-marched SDF scene with soft shadows
`gfx-sdf-raymarch-scene` · Y1-P0 · level 3 · 4 h · GLSL, OpenGL

**Goal.** A fragment shader scene using sphere tracing, normals by gradient, soft shadows and AO.  
**Approach.** Implement a sphere tracing loop → Estimate normals by central difference → Add soft shadow and AO terms  
**Done when.** Scene of 6+ primitives renders at 60 FPS at 720p with soft shadows.  
**Measure.** Steps per ray and frame ms  
**Pitfalls.** Overstepping on non-Lipschitz SDFs; Shadow banding  

### Skybox and environment reflections
`gfx-cubemap-skybox-reflection` · Y1-P1 · level 2 · 3 h · OpenGL 4.6

**Goal.** A cube-mapped skybox with reflective and refractive objects including Fresnel.  
**Approach.** Load six faces or a cross layout → Render skybox depth-last → Reflect and refract by view vector  
**Done when.** Object shows correct mirrored environment and chromatic refraction option.  
**Pitfalls.** Skybox translating with camera; Seams from clamp mode  

### Steering behaviours sandbox
`gfx-steering-behaviours-lab` · Y1-P1 · level 2 · 4 h · C++ or Python, raylib/pygame

**Goal.** Seek, flee, arrive, pursue, wander, obstacle avoidance and path following combined with weighted blending.  
**Approach.** Implement each behaviour as a force → Blend with priorities → Add debug vectors  
**Done when.** Agents follow a path through an obstacle field without collisions for 5 minutes.  
**Measure.** Collisions per minute  
**Pitfalls.** Weight tuning by trial only; Oscillation near arrival  

### Dungeon generation: BSP rooms and cellular caves
`gfx-dungeon-bsp-caves` · Y1-P1 · level 2 · 4 h · Python or C++

**Goal.** Two generators with connectivity guarantees and a seed-reproducible output.  
**Approach.** BSP split with room carving and corridors → Cellular automata cave smoothing → Flood fill to ensure connectivity  
**Done when.** 1000 seeds produce fully connected maps with stats on room count.  
**Measure.** Fraction of seeds disconnected before fix  
**Pitfalls.** Disconnected islands; Corridors cutting rooms  

### Roguelike field of view with recursive shadowcasting
`gfx-roguelike-fov-shadowcast` · Y1-P1 · level 2 · 3 h · Python or C++

**Goal.** FOV and fog-of-war memory on a tile map using symmetric shadowcasting.  
**Approach.** Implement octant recursion → Maintain explored memory → Compare with raycast FOV  
**Done when.** FOV is symmetric (A sees B iff B sees A) on 1000 random pairs.  
**Measure.** Asymmetric pair count  
**Pitfalls.** Diagonal peeking artefacts; Slope rounding errors  

### Normal mapping with tangent-space basis
`gfx-normal-mapping-tbn` · Y1-P1 · level 3 · 4 h · OpenGL 4.6, GLSL

**Goal.** Brick and stone normal-mapped surfaces with per-vertex tangents and MikkTSpace-like consistency.  
**Approach.** Compute tangents from UVs → Build TBN in vertex shader → Compare with and without orthogonalisation  
**Done when.** Lighting is consistent across mirrored UVs and curved meshes.  
**Pitfalls.** Flipped green channel convention; Mirrored UV handedness  

### Shadow maps with PCF and PCSS
`gfx-shadow-map-pcf-pcss` · Y1-P1 · level 3 · 5 h · OpenGL 4.6

**Goal.** A directional and spot shadow system with Poisson PCF and contact-hardening soft shadows.  
**Approach.** Render depth maps and fit frustum → Add PCF with rotated Poisson disk → Implement blocker search for PCSS  
**Done when.** PCSS shows harder contact shadows and wider penumbra with distance; cost compared with PCF.  
**Measure.** Shadow pass ms; PCF vs PCSS cost  
**Pitfalls.** Light-space frustum too large; Fixed penumbra scale  

### Deferred renderer with G-buffer inspector
`gfx-deferred-gbuffer-renderer` · Y1-P1 · level 3 · 6 h · OpenGL 4.6

**Goal.** A deferred pipeline with MRT G-buffer, 200 point lights and debug views.  
**Approach.** Design G-buffer layout → Light pass with light volumes or tiles → Add debug view per attachment  
**Done when.** 200 lights render at 60 FPS and forward comparison number is reported.  
**Measure.** Forward vs deferred ms at 200 lights  
**Pitfalls.** Bandwidth blowup from fat G-buffer; Transparency unsupported  

### Anti-aliasing comparison: MSAA, FXAA, SMAA-lite
`gfx-aa-fxaa-smaa-compare` · Y1-P1 · level 3 · 4 h · OpenGL 4.6

**Goal.** A switchable AA lab with quality and cost measurements on thin geometry and specular shimmer.  
**Approach.** Enable MSAA FBOs → Implement FXAA luma edge pass → Implement a simplified morphological pass  
**Done when.** Table of ms and visual notes for each method at 1080p.  
**Measure.** ms per frame and edge error vs 16x reference  
**Pitfalls.** Applying FXAA before tonemap; Blurring text  

### Navmesh generation and funnel path smoothing
`gfx-navmesh-funnel-path` · Y1-P1 · level 3 · 6 h · C++ or Python

**Goal.** Build a triangle navmesh from polygon obstacles, A* over triangles, and string-pull the path.  
**Approach.** Triangulate walkable area → A* on triangle adjacency → Funnel algorithm for portals  
**Done when.** Paths are shorter than grid A* by a reported percentage and never cross walls.  
**Measure.** Path length vs grid A*  
**Pitfalls.** Funnel handedness bugs; Degenerate triangles  

### Wave Function Collapse tile generator
`gfx-wfc-tile-generator` · Y1-P1 · level 3 · 5 h · Python or C++

**Goal.** Simple-tiled WFC producing coherent maps with backtracking on contradiction.  
**Approach.** Define tile adjacency rules → Propagate with entropy-lowest selection → Restart or backtrack on contradiction  
**Done when.** Generates 64x64 maps with under 5% restarts for a given tileset.  
**Measure.** Contradiction rate  
**Pitfalls.** Floating point entropy ties; Propagation not exhaustive  

### Double pendulum chaos and Lyapunov estimate
`gfx-double-pendulum-chaos` · Y1-P1 · level 3 · 3 h · Python, NumPy, matplotlib

**Goal.** Simulate with RK4, visualise a divergence of two nearby trajectories and estimate the Lyapunov exponent.  
**Approach.** Derive Lagrangian equations → RK4 stepping → Track separation growth  
**Done when.** Estimate agrees with literature within a factor 2 and a divergence plot is produced.  
**Measure.** Largest Lyapunov exponent  
**Pitfalls.** Wrong equations of motion; Timestep too coarse  

### Spatial hash grid broadphase
`gfx-spatial-hash-broadphase` · Y1-P1 · level 3 · 3 h · C++20

**Goal.** A uniform grid and hash broadphase for 50k circles with cell-size tuning study.  
**Approach.** Hash cell coordinates → Insert and query neighbours → Sweep cell size  
**Done when.** Finds identical pairs to brute force and shows optimal cell size ~2x radius.  
**Measure.** Pair queries/s vs cell size  
**Pitfalls.** Duplicate pairs across cells; Hash clustering  

### Linear blend skinning on the CPU
`gfx-linear-blend-skinning-cpu` · Y1-P1 · level 3 · 5 h · C++ or Python

**Goal.** A skinned character from glTF animated with LBS, demonstrating candy-wrapper artefacts and dual quaternion fix.  
**Approach.** Load skeleton and weights → Compute bone matrices → Implement dual quaternion skinning  
**Done when.** Side-by-side shows LBS collapse vs DQS at a twisted joint.  
**Measure.** Skinning time per frame  
**Pitfalls.** Inverse bind matrix order; Unnormalised weights  

### Immediate-mode GUI library
`gfx-immediate-mode-gui` · Y1-P1 · level 3 · 6 h · C++20, OpenGL

**Goal.** A small IMGUI with buttons, sliders, text input and windows rendered through a batched draw list.  
**Approach.** Hot/active ID model → Layout cursor → Draw list with clipping  
**Done when.** A tool panel with 6 widget types works with mouse and keyboard.  
**Measure.** Draw calls per frame  
**Pitfalls.** ID collisions; Input lag from frame ordering  

### GOAP planner for a survival agent
`gfx-goap-planner-toy` · Y1-P1 · level 3 · 5 h · Python or C++

**Goal.** An agent selecting action sequences via A* over world-state with costs, replanning on failure.  
**Approach.** Model actions with preconditions/effects → A* over state bitmasks → Replan on world change  
**Done when.** Agent reaches 3 different goals using different plans and replans after sabotage.  
**Measure.** Plan length and planner time  
**Pitfalls.** State explosion; Stale plans  

### Voxel chunk greedy mesher
`gfx-voxel-greedy-mesher` · Y1-P1 · level 3 · 5 h · C++ or Rust, OpenGL

**Goal.** Chunked voxel world meshing with face culling, greedy merging and ambient occlusion per vertex.  
**Approach.** Cull hidden faces → Greedy merge coplanar quads → Compute vertex AO  
**Done when.** Greedy mesh cuts triangles by at least 5x vs naive on terrain.  
**Measure.** Triangle count naive vs greedy  
**Pitfalls.** AO anisotropy flip; Chunk boundary seams  

### Scene graph with dirty-flag transforms
`gfx-scene-graph-dirty-flags` · Y2 · level 3 · 4 h · C++20

**Goal.** A hierarchy with local/world transforms, lazy updates, and frustum culling over bounding volumes.  
**Approach.** Parent-child with dirty propagation → Flatten into depth-ordered array → Cull with AABB vs frustum  
**Done when.** 10k nodes update only changed subtrees; cull test hides off-screen objects.  
**Measure.** Transform updates per frame vs naive  
**Pitfalls.** Stale world matrices; Non-uniform scale bounds  

### glTF 2.0 loader with asset cache and handles
`gfx-gltf-asset-cache` · Y2 · level 3 · 6 h · C++20, cgltf or hand parser

**Goal.** Load meshes, materials and textures with ref-counted handles and async texture decode.  
**Approach.** Parse accessors/bufferViews → Create handle-based cache → Decode textures on worker threads  
**Done when.** The same model loaded twice shares GPU resources; load time reported.  
**Measure.** Load ms cold vs warm  
**Pitfalls.** Sparse accessors; Interleaved buffer strides  

### Water: Gerstner waves, Fresnel and screen-space reflections
`gfx-water-gerstner-ssr` · Y2 · level 3 · 5 h · OpenGL or Vulkan

**Goal.** A water surface with summed Gerstner waves, refraction, foam and SSR with fallback to environment.  
**Approach.** Displace grid in vertex shader → Fresnel blend refraction and reflection → Add SSR ray march with fallback  
**Done when.** Water looks plausible with reflections of off-screen objects falling back smoothly.  
**Measure.** SSR ms  
**Pitfalls.** Reflection holes at screen edges; Aliasing in normals  

### Vulkan: triangle to textured quad with staging
`gfx-vulkan-textured-quad` · Y2 · level 3 · 6 h · C++20, Vulkan

**Goal.** Vertex/index buffers, staging uploads, image layout transitions and a sampler.  
**Approach.** Allocate with VMA → Upload via staging queue → Transition layouts and sample  
**Done when.** A textured quad renders with zero validation errors and mipmaps via blit.  
**Measure.** Upload throughput  
**Pitfalls.** Missing layout transition barriers; Leaking staging buffers  

### GPU particles with compute shaders
`gfx-compute-particles-gl` · Y2 · level 3 · 5 h · OpenGL 4.6 compute

**Goal.** Compute-updated 2M particles with attractors, indirect draw and sorted alpha option.  
**Approach.** SSBO particle buffer → Compute update with atomics for counters → Indirect draw of alive list  
**Done when.** 2M particles at 60 FPS; CPU-side cost under 0.2 ms.  
**Measure.** Particles at 60 FPS  
**Pitfalls.** Memory barriers missing; Dead particle compaction cost  

### Audio mixer with 3D spatialisation
`gfx-audio-mixer-spatial` · Y2 · level 3 · 5 h · C++20, miniaudio or OpenAL

**Goal.** A mixer with streaming, voice limits, distance attenuation, panning and Doppler.  
**Approach.** Lock-free command queue → Mix on audio thread → Spatialise with listener transform  
**Done when.** 32 voices play without underruns; positional cues audible in a test scene.  
**Measure.** Underruns per minute, CPU % audio thread  
**Pitfalls.** Locking in the callback; Clicks at voice start/stop  

### Native code hot reload via shared library
`gfx-c-plugin-hot-reload` · Y2 · level 3 · 4 h · C/C++, dlopen or LoadLibrary

**Goal.** A host that reloads a game DLL on rebuild preserving state in host memory.  
**Approach.** Split host and game → Copy-then-load to avoid file locks → Keep state in a host-owned arena  
**Done when.** Edit-save-see loop under 2 s while a counter state persists.  
**Measure.** Reload latency ms  
**Pitfalls.** Pointers into old module (vtables, strings); Static state lost  

### Lua scripting layer with sandboxed entity API
`gfx-lua-scripting-bindings` · Y2 · level 3 · 5 h · C++20, Lua

**Goal.** Scripts attach to entities, receive update events and call a safe API with hot reload.  
**Approach.** Embed Lua and bind userdata → Per-entity script environments → Add instruction count limit  
**Done when.** Scripts add behaviour at runtime; infinite loop script is aborted by the limiter.  
**Measure.** Script calls/s at 1k entities  
**Pitfalls.** GC pressure from per-frame tables; Dangling entity references  

### Mass-spring jelly soft body in 2D
`gfx-mass-spring-jelly-2d` · Y2 · level 3 · 4 h · C++ or Python

**Goal.** A pressure-based soft body with internal springs colliding with a polygon world.  
**Approach.** Ring of masses with cross springs → Pressure from enclosed area → Implicit or small-step integration  
**Done when.** Jelly bounces stably with energy decay and no tunnelling at 60 Hz.  
**Measure.** Max velocity and area error  
**Pitfalls.** Stiff springs exploding; Inverted triangles  

### Behaviour tree arena AI with debugger
`gfx-bt-arena-ai` · Y2 · level 3 · 6 h · C++20

**Goal.** Squad enemies using BTs and a utility-score tactic layer with a live tree visualiser.  
**Approach.** Reuse a BT core → Add utility selector for target choice → Visualise node state in-game  
**Done when.** Enemies flank, retreat when low and the visualiser shows live node status.  
**Measure.** Decision time per agent us  
**Pitfalls.** Debug tools affecting timings; Non-deterministic seeds  

### Archetype ECS storage and queries
`gfx-ecs-archetype-storage` · Y2 · level 4 · 6 h · C++20

**Goal.** An archetype-based ECS with chunked SoA tables, structural change deferral and typed queries.  
**Approach.** Hash component sets to archetypes → Move entities between tables → Iterate queries over chunks  
**Done when.** Query iteration over 1M entities beats sparse-set version; benchmark published.  
**Measure.** ns/entity for 3-component query  
**Pitfalls.** Invalidation during iteration; Slow structural changes  

### Work-stealing job system
`gfx-job-system-workstealing` · Y2 · level 4 · 7 h · C++20

**Goal.** A thread pool with per-thread deques, dependencies via counters and parallel_for.  
**Approach.** Chase-Lev deque → Job counters for dependencies → Parallel-for with grain size  
**Done when.** parallel_for achieves at least 0.7 efficiency on 8 threads and passes TSAN.  
**Measure.** Speedup vs threads  
**Pitfalls.** ABA and memory-order bugs; Oversplitting tiny jobs  

### Cascaded shadow maps with stable fitting
`gfx-cascaded-shadow-maps` · Y2 · level 4 · 6 h · OpenGL 4.6 or Vulkan

**Goal.** 3-4 cascades with practical split scheme, texel snapping and blending between cascades.  
**Approach.** Compute split distances → Fit ortho to frustum slices → Snap to texel grid and blend  
**Done when.** No shimmering while rotating the camera and visible cascade debug overlay.  
**Measure.** Shadow pass ms; texels per world unit per cascade  
**Pitfalls.** Swimming shadows; Near-plane clipping of casters  

### Image-based lighting: irradiance, prefilter, BRDF LUT
`gfx-ibl-prefilter-brdf-lut` · Y2 · level 4 · 6 h · OpenGL 4.6, GLSL

**Goal.** Bake diffuse irradiance, specular prefiltered mips and split-sum LUT from an HDR environment.  
**Approach.** Convolve irradiance to SH or cubemap → GGX importance sample mips → Bake BRDF LUT  
**Done when.** Metal spheres of increasing roughness match a reference renderer visually.  
**Measure.** Bake time  
**Pitfalls.** Seams on cubemap mips; Energy loss at high roughness  

### Volumetric fog and light shafts
`gfx-volumetric-fog-raymarch` · Y2 · level 4 · 6 h · OpenGL or Vulkan, compute

**Goal.** A froxel-based or ray-marched participating medium with shadowed light scattering.  
**Approach.** Build a froxel grid → Inject light with shadows → Integrate front to back and apply  
**Done when.** Fog responds to shadow-casting light with visible shafts at under 2 ms.  
**Measure.** Fog pass ms at 1080p  
**Pitfalls.** Temporal flicker; Aliasing from low depth slices  

### Vulkan descriptors and per-frame uniform ring
`gfx-vulkan-descriptor-ring` · Y2 · level 4 · 6 h · C++20, Vulkan

**Goal.** Frames-in-flight with a dynamic uniform ring buffer, push constants and bindless-style texture array.  
**Approach.** Per-frame resources → Dynamic offsets into a ring → Descriptor indexing for textures  
**Done when.** Three frames in flight render 1000 objects with different materials and sync validation clean.  
**Measure.** Frame time vs frames in flight  
**Pitfalls.** CPU overwriting in-flight data; Descriptor set explosion  

### UDP snapshot interpolation netcode
`gfx-udp-snapshot-interpolation` · Y2 · level 4 · 6 h · C++ or Rust, UDP

**Goal.** Authoritative server, client interpolation buffer and prediction with reconciliation.  
**Approach.** Reliable-ish UDP layer with sequence/ack → Snapshots at 20 Hz with delta compression → Client prediction and rewind  
**Done when.** Under 100 ms RTT and 5% loss the player moves smoothly; bandwidth measured.  
**Measure.** KB/s per client  
**Pitfalls.** Mispredictions snapping; Unbounded buffer growth  

### Stam stable fluids in 2D
`gfx-stable-fluids-2d` · Y3 · level 3 · 5 h · GLSL or C++

**Goal.** Semi-Lagrangian advection, diffusion and pressure projection with dye and mouse forcing.  
**Approach.** Advect velocity and dye → Jacobi pressure solve → Subtract gradient  
**Done when.** Divergence after projection is under 1e-3 and sim runs real time at 512x512.  
**Measure.** Mean divergence  
**Pitfalls.** Boundary conditions; Too few Jacobi iterations  

### Animation blend tree and state machine
`gfx-anim-blend-statemachine` · Y3 · level 4 · 6 h · C++20, glTF

**Goal.** Locomotion with 1D/2D blend spaces, transitions with cross-fade, and additive layers.  
**Approach.** Sample clips with root motion → Blend by parameter with phase sync → State machine with transition rules  
**Done when.** Walk-run-turn blending has no foot sliding above a reported threshold.  
**Measure.** Foot slide cm/s  
**Pitfalls.** Unsynchronised phases; Quaternion sign flip during blend  

### Motion matching prototype
`gfx-motion-matching-proto` · Y3 · level 4 · 7 h · Python or C++, BVH mocap

**Goal.** A feature database of poses and trajectories searched every few frames to drive a character.  
**Approach.** Extract pose and trajectory features → Normalise and weight them → Nearest-neighbour search with KD-tree and inertialisation blend  
**Done when.** Character follows a joystick path with visually continuous motion.  
**Measure.** Query time us; feature DB size  
**Pitfalls.** Poorly scaled feature weights; Jitter from switching too often  

### MuJoCo cartpole with LQR balance
`gfx-mujoco-cartpole-lqr` · Y3 · level 4 · 5 h · Python, MuJoCo, SciPy

**Goal.** Linearise the model numerically and stabilise the pendulum with LQR, with disturbance tests.  
**Approach.** Build MJCF cartpole → Linearise with finite differences (mjd_transitionFD) → Solve Riccati and run control  
**Done when.** Pole recovers from a 10 degree start and a push, plotted with settling time.  
**Measure.** Settling time s  
**Pitfalls.** Wrong state ordering; Actuator gear mismatch  

### MuJoCo 6-DoF arm with Jacobian IK and operational space control
`gfx-mujoco-arm-ik-control` · Y3 · level 4 · 7 h · Python, MuJoCo

**Goal.** A simulated arm tracking a moving target via Jacobian IK and a task-space PD controller.  
**Approach.** Load a menagerie-like arm MJCF → Compute site Jacobians → Implement damped IK and OSC  
**Done when.** End effector tracks a circle with under 5 mm error.  
**Measure.** Mean tracking error mm  
**Pitfalls.** Singularities; Joint limit violations  

### Lattice Boltzmann D2Q9 flow past a cylinder
`gfx-lbm-d2q9-cylinder` · Y3 · level 4 · 6 h · C++ or CUDA/GLSL

**Goal.** LBM channel flow showing von Karman vortex shedding at a chosen Reynolds number.  
**Approach.** Implement collision and streaming → Bounce-back obstacles and inflow → Measure shedding frequency  
**Done when.** Strouhal number lands within 15% of the textbook value.  
**Measure.** Strouhal number  
**Pitfalls.** Instability at low viscosity; Wrong relaxation time  

### Position-based hair strands
`gfx-pbd-hair-strands` · Y3 · level 4 · 6 h · C++ or compute shaders

**Goal.** Hair strands with stretch, bend and collision constraints against a head capsule, rendered as line strips.  
**Approach.** Chains with distance constraints → Local shape matching or bend constraints → Collide with capsules  
**Done when.** 1,000 strands run real time with stable settling and no penetration.  
**Measure.** Strands at 60 FPS  
**Pitfalls.** Constraint stiffness depending on iteration count; Penetrating thin colliders  

## hardware

### Monte Carlo tolerance analysis in SPICE
`hw-spice-monte-carlo-tolerance` · Y3 · level 3 · 3 h · ngspice, Python

**Goal.** A scripted 1000-run study of a filter or divider circuit with component tolerances.  
**Approach.** Parameterise R and C with random values → Run 1000 simulations in batch → Plot histogram of cutoff frequency  
**Done when.** Histogram of fc with mean, sigma and yield against a spec.  
**Measure.** Sigma of fc and yield (%)  
**Pitfalls.** Using the same random draw for every component  

### LQR for a cart-pole in simulation
`hw-lqr-cartpole-sim` · Y3 · level 4 · 5 h · Python, numpy, scipy.linalg

**Goal.** A linearised cart-pole stabilised by LQR with a swing-up-free test around upright.  
**Approach.** Linearise dynamics → Solve Riccati with scipy → Simulate nonlinear plant with disturbance  
**Done when.** Recovers from 15 degree initial tilt in under 3 s.  
**Measure.** Settling time (s) and max force (N)  
**Pitfalls.** Q/R weights giving actuator saturation  

### Instrumentation amp for a strain gauge
`hw-instrumentation-amp-strain` · Y4 · level 3 · 5 h · Op-amps, load cell, MCU ADC

**Goal.** A three-op-amp in-amp circuit reading a load cell, calibrated against known masses.  
**Approach.** Simulate gain and CMRR in ngspice → Build on perfboard with 0.1% resistors → Calibrate with 5 reference masses  
**Done when.** Linear fit of output vs mass has R^2 above 0.999.  
**Measure.** Resolution (g) and linearity error (%)  
**Pitfalls.** Offset drift from unbalanced input bias paths  
**Parts.** Load cell 1-5 kg $8, op-amp quad $2-4, 0.1% resistors $5, MCU $10  

### Adjustable linear bench supply
`hw-linear-bench-supply` · Y4 · level 3 · 6 h · LM317 or discrete pass transistor, transformer

**Goal.** A 1.2-15 V, 1 A linear supply with current limit and measured regulation.  
**Approach.** Choose transformer and rectifier → Add regulator, current limit, heatsink → Measure line and load regulation  
**Done when.** Load regulation under 1% from 0 to 1 A and ripple below 5 mV.  
**Measure.** Load regulation (%) and ripple (mV)  
**Pitfalls.** Underestimating dissipation at low output voltage  
**Parts.** Transformer $15, LM317 + parts $10, heatsink $5, enclosure $10  

### RTOS tasks with queues and mutexes
`hw-rtos-producer-consumer` · Y4 · level 3 · 4 h · FreeRTOS or Zephyr, C

**Goal.** Sensor, processing and logging tasks communicating through queues with measured latency.  
**Approach.** Define three tasks and priorities → Pass samples through a queue → Toggle a GPIO to measure latency  
**Done when.** Worst-case queue-to-handler latency measured over 10 minutes.  
**Measure.** Worst-case latency (us)  
**Pitfalls.** Priority inversion with a shared mutex  
**Parts.** MCU dev board $10-25, logic analyzer $10  

### VGA colour bars and moving sprite on FPGA
`hw-fpga-vga-test-pattern` · Y4 · level 3 · 6 h · Verilog, 640x480 timing, FPGA board

**Goal.** A VGA signal generator drawing a pattern and a bouncing square.  
**Approach.** Generate hsync/vsync counters → Output colour bar pattern → Add a moving sprite with frame update  
**Done when.** Monitor locks at 640x480@60 with stable image.  
**Measure.** Pixel clock error (%)  
**Pitfalls.** Blanking intervals not zeroing colour  
**Parts.** FPGA board with VGA/HDMI (e.g. Tang Nano, iCEBreaker) $25-80, VGA resistor DAC $5  

### FPGA SPI master reading an ADC
`hw-fpga-spi-adc-reader` · Y4 · level 3 · 5 h · Verilog, FPGA board, MCP3008 or similar

**Goal.** A hardware SPI master streaming samples into a block RAM and out over UART.  
**Approach.** Write SPI master state machine → Buffer samples in BRAM → Send readings over UART to a PC plot  
**Done when.** Measured sine input reconstructed with correct frequency on PC.  
**Measure.** Sample rate (ksps)  
**Pitfalls.** SPI mode (CPOL/CPHA) mismatch  
**Parts.** FPGA board $25-80, SPI ADC $3-5, signal source  

### Fixed-point IIR biquad on an MCU
`hw-biquad-fixed-point` · Y4 · level 3 · 5 h · C, Q15 arithmetic, MCU DSP

**Goal.** A Q15 biquad low-pass compared against float reference with overflow handling.  
**Approach.** Derive coefficients in Python → Implement direct form II transposed in Q15 → Compare error against float  
**Done when.** Max error under 3 LSB and no overflow on full-scale input.  
**Measure.** Cycles per sample and error (LSB)  
**Pitfalls.** Coefficient quantisation destabilising high-Q poles  
**Parts.** MCU board $10-20  

### DTMF tone decoder with Goertzel
`hw-goertzel-dtmf-decoder` · Y4 · level 3 · 4 h · C, MCU ADC, microphone

**Goal.** A tone decoder identifying phone keypad digits in real time.  
**Approach.** Sample at 8 kHz → Run eight Goertzel filters per block → Add thresholds and twist checks  
**Done when.** Decodes 16 keys with at least 95% accuracy from a phone speaker.  
**Measure.** Detection rate (%) and CPU load  
**Pitfalls.** Block length not matching bin centres  
**Parts.** MCU board $10, electret mic amp module $4  

### IMU tilt: complementary vs Kalman
`hw-imu-complementary-kalman` · Y4 · level 3 · 6 h · C/Python, MPU-6050 or BNO sensor

**Goal.** Tilt angle estimated by three methods and compared against a protractor reference.  
**Approach.** Log raw gyro and accel → Implement complementary and 2-state Kalman → Compare noise and lag on a rocking rig  
**Done when.** Kalman RMS error below accelerometer-only by at least 3x.  
**Measure.** RMS angle error (deg)  
**Pitfalls.** Gyro bias not estimated  
**Parts.** IMU breakout $5-10, MCU board $10  

### DC motor system identification
`hw-dc-motor-sysid` · Y4 · level 3 · 6 h · C, Python, encoder motor

**Goal.** A transfer function of a real motor from step and PRBS data and a validation on held-out data.  
**Approach.** Drive motor with PRBS voltage → Estimate model with least squares → Validate on separate sequence  
**Done when.** Model fit above 85% on validation set.  
**Measure.** Fit percentage and electrical/mechanical time constants  
**Pitfalls.** Voltage saturation hiding dynamics  
**Parts.** Geared DC motor with encoder $12-20, H-bridge $5, MCU $10, 12 V supply  

### PID reflow hot plate controller
`hw-reflow-hotplate-controller` · Y4 · level 3 · 8 h · C, thermocouple amp, SSR

**Goal.** A temperature profile follower for a hot plate following a leaded solder reflow curve.  
**Approach.** Characterise plate heating → Implement PID with feed-forward → Follow ramp-soak-peak profile  
**Done when.** Profile tracked within 5 C and no overshoot beyond peak spec.  
**Measure.** Max tracking error (C)  
**Pitfalls.** Integral windup during ramps  
**Parts.** Hot plate or mini oven $20-30, SSR $8, thermocouple amp $8, MCU $10  

### Boost converter on a prototype board
`hw-boost-converter-build` · Y4 · level 4 · 7 h · Boost controller IC, scope

**Goal.** A 5 V to 12 V boost converter built and characterised for efficiency.  
**Approach.** Pick inductor and diode from ripple calc → Assemble and probe switch node → Measure efficiency at 5 load points  
**Done when.** Efficiency curve plotted and peak efficiency above 80%.  
**Measure.** Peak efficiency (%) and ripple (mV)  
**Pitfalls.** Long scope ground lead giving fake spikes  
**Parts.** Boost IC module or chip $3-8, inductor $3, caps/diode $5, load resistors $5  

### SPI flash driver in embedded Rust
`hw-rust-embassy-spi-flash` · Y4 · level 4 · 6 h · Rust, embedded-hal, Embassy

**Goal.** A driver supporting read, page program and sector erase with a test harness.  
**Approach.** Implement the JEDEC ID and status polling → Add read, program, erase → Verify via write-read-compare pattern  
**Done when.** Full chip pattern test passes and erase wear counter logged.  
**Measure.** Read and write throughput (KB/s)  
**Pitfalls.** Forgetting write-enable before each program  
**Parts.** SPI flash breakout (W25Q) $3-6, MCU board $10  

### USB CDC serial device from descriptors
`hw-usb-cdc-device` · Y4 · level 4 · 7 h · C/Rust, MCU USB peripheral

**Goal.** A device enumerating as a serial port with hand-built descriptors.  
**Approach.** Write device and config descriptors → Handle control transfers → Echo data over bulk endpoints  
**Done when.** Host sees a COM port and echoes 1 MB without corruption.  
**Measure.** Throughput (KB/s)  
**Pitfalls.** Wrong endpoint packet size for full speed  
**Parts.** MCU with USB (RP2040/STM32) $5-20  

### Serial bootloader that flashes new firmware
`hw-uart-bootloader-dfu` · Y4 · level 4 · 8 h · C, linker scripts, MCU flash

**Goal.** A bootloader receiving a CRC-checked image over UART and jumping to it.  
**Approach.** Split flash into boot and app regions → Receive and program pages → Verify CRC and jump to app vector  
**Done when.** Update succeeds and a corrupted image is rejected, with fallback boot.  
**Measure.** Update time (s) for 64 KB  
**Pitfalls.** Not relocating the vector table  
**Parts.** STM32 or similar board $15, USB-UART adapter $5  

### Async FIFO with clock domain crossing
`hw-fpga-async-fifo-cdc` · Y4 · level 4 · 6 h · Verilog, Gray-code pointers, simulation

**Goal.** A dual-clock FIFO verified with random testbench at mismatched clock rates.  
**Approach.** Write Gray-code pointer synchronisers → Generate full/empty flags → Fuzz with 3:7 clock ratio  
**Done when.** 1M random words transferred in order with no loss.  
**Measure.** Words verified and max depth used  
**Pitfalls.** Binary pointers crossing domains  

### State feedback with observer on a motor
`hw-state-feedback-servo` · Y4 · level 4 · 7 h · Python design, C implementation, encoder motor

**Goal.** Pole-placement controller with a Luenberger observer estimating velocity.  
**Approach.** Build discrete state-space model → Place controller and observer poles → Run on MCU at 1 kHz  
**Done when.** Step response overshoot under 5% and settling within spec.  
**Measure.** Overshoot (%) and settling time (ms)  
**Pitfalls.** Observer poles too fast amplifying encoder noise  
**Parts.** Geared motor + encoder $15, driver $5, MCU $10  

### Bracket FEA and mass reduction
`hw-fea-bracket-optimization` · Y5 · level 3 · 6 h · FreeCAD FEM or Fusion Simulation, CalculiX-free workflow

**Goal.** A bracket redesigned to cut mass 30% while keeping safety factor above 2.  
**Approach.** Define loads and constraints → Run baseline stress analysis → Iterate pockets and fillets  
**Done when.** Final design mass down at least 30% with safety factor at least 2.  
**Measure.** Mass (g) and safety factor  
**Pitfalls.** Stress singularities at sharp constrained corners  

### Four-bar linkage synthesis and test
`hw-fourbar-linkage-sim` · Y5 · level 3 · 5 h · Python, CAD, 3D-printed pins

**Goal.** A four-bar linkage designed for a path with a printed prototype comparing traced and predicted path.  
**Approach.** Solve for link lengths → Simulate coupler curve → Print and trace with a pen  
**Done when.** Traced curve matches simulated curve within 3 mm.  
**Measure.** Max path deviation (mm)  
**Pitfalls.** Link interference not checked in assembly  
**Parts.** 3D print filament $5, M3 hardware $5  

### Parametric enclosure with snap fits
`hw-parametric-enclosure` · Y5 · level 3 · 5 h · FreeCAD/Fusion parameters, 3D printer

**Goal.** A parametric box design with snap fits and standoffs adapting to a PCB size.  
**Approach.** Define PCB size and clearance parameters → Model snap features with cantilever calc → Print and fit-check  
**Done when.** Enclosure assembles with three different PCB sizes by changing only parameters.  
**Measure.** Snap-fit strain (%) vs material limit  
**Pitfalls.** Layer orientation across snap arm  
**Parts.** Filament $5-10, M2/M3 screws $5  

### Fin heat transfer experiment
`hw-fin-heat-transfer-experiment` · Y5 · level 3 · 6 h · Python, thermocouples, aluminium rod

**Goal.** Measured temperature profile along a heated rod compared with fin theory.  
**Approach.** Heat one end at constant temperature → Log temperatures at 5 points → Fit h from fin equation  
**Done when.** Predicted vs measured profile within 10%.  
**Measure.** Fitted h (W/m^2K)  
**Pitfalls.** Poor thermal contact between thermocouples and rod  
**Parts.** Aluminium rod $8, thermocouples/amp $15, heater $10, insulation $5  

### Print orientation vs strength test
`hw-print-orientation-strength` · Y5 · level 3 · 6 h · 3D printer, weights, Python

**Goal.** Tensile or bend coupons printed in three orientations with measured failure loads.  
**Approach.** Design standard coupons → Print 3 per orientation → Load with weights until failure  
**Done when.** Mean failure load with standard deviation reported per orientation.  
**Measure.** Failure load (N) per orientation  
**Pitfalls.** Different cooling between samples  
**Parts.** Filament $20, hanging bucket and weights $10, calipers $15  

### Differential drive odometry calibration
`hw-diff-drive-odometry` · Y5 · level 3 · 6 h · C/Python, encoders, small chassis

**Goal.** Wheel odometry with UMBmark-style calibration reducing square-path drift.  
**Approach.** Compute pose from encoder ticks → Drive 4 m square paths → Calibrate wheel diameter and base  
**Done when.** Closing error after 4 m square reduced by at least 50%.  
**Measure.** Closing error (cm) before and after  
**Pitfalls.** Wheel slip on smooth floors  
**Parts.** 2WD chassis kit with encoders $25-40, MCU $10, motor driver $5  

### ROS 2 driver node for an IMU
`hw-ros2-imu-driver-node` · Y5 · level 3 · 5 h · ROS 2, rclcpp or rclpy, I2C IMU

**Goal.** A node publishing sensor_msgs/Imu with covariance and TF, calibrated for bias.  
**Approach.** Read IMU on single-board computer → Publish Imu at 100 Hz → Calibrate bias and fill covariance  
**Done when.** Topic rate within 2% of 100 Hz and gyro bias under 0.1 deg/s after calibration.  
**Measure.** Publish rate and gyro bias  
**Pitfalls.** Wrong frame_id or axis conventions  
**Parts.** Raspberry Pi or similar $35-60, IMU breakout $8  

### Feeds and speeds experiment on a hobby mill
`hw-cnc-feeds-speeds` · Y5 · level 3 · 6 h · Python calculator, desktop CNC, aluminium or wood

**Goal.** A calculator and cutting trials comparing predicted and observed chip load and surface finish.  
**Approach.** Compute chip load and MRR → Cut slots at 3 feeds → Rate finish and measure tool wear  
**Done when.** Table linking feed to finish quality and spindle current.  
**Measure.** Chip load (mm/tooth) at best finish  
**Pitfalls.** Tool deflection spoiling slot width  
**Parts.** Access to a hobby CNC/router; end mills $15, stock $10  

## inference

### MFU and bandwidth utilization calculator
`inf-mfu-calculator` · Y2 · level 2 · 3 h · Python, Hugging Face configs

**Goal.** A tool reading a model config and measured step time to report MFU or MBU for prefill and decode.  
**Approach.** Compute FLOPs and bytes from config → Ingest measured latencies → Report MFU/MBU → Validate on two models  
**Done when.** Hand-checked example matches and the tool is run on two real models.  
**Measure.** MFU prefill, MBU decode  
**Pitfalls.** Counting causal attention FLOPs twice  

### Matrix transpose optimization ladder in CUDA
`inf-cuda-transpose-ladder` · Y2 · level 3 · 4 h · CUDA C++, Nsight Compute

**Goal.** Five transpose kernels from naive to tiled, padded and vectorized, with a bandwidth chart.  
**Approach.** Write naive and copy baselines → Add shared-memory tile and padding → Add float4 loads and tune tile size → Chart GB/s vs copy ceiling  
**Done when.** Best kernel reaches at least 85% of copy bandwidth on 8192x8192 floats.  
**Measure.** GB/s per version  
**Pitfalls.** Uncoalesced writes in the tiled version; Partition camping myths  

### Softmax kernel ladder: naive to online to fused
`inf-cuda-softmax-ladder` · Y2 · level 3 · 5 h · CUDA C++

**Goal.** Four softmax kernels including a one-pass online-softmax version, compared at several row widths.  
**Approach.** Three-pass baseline → Warp-per-row for short rows → Block-per-row with online max/sum → Benchmark vs torch  
**Done when.** Online kernel matches torch to 1e-5 and is within 1.3x of torch speed across widths 128-32768.  
**Measure.** GB/s vs row width  
**Pitfalls.** Wrong rescale when merging partial maxes  

### Fused RMSNorm with residual add in CUDA
`inf-cuda-rmsnorm-fused` · Y2 · level 3 · 4 h · CUDA C++, PyTorch extension

**Goal.** A PyTorch extension op fusing residual add and RMSNorm with bf16 IO and fp32 accumulation.  
**Approach.** Write kernel with vectorized loads → Bind via torch extension → Unit test vs eager → Benchmark in a decoder block  
**Done when.** Max error under 1e-2 in bf16 and at least 1.5x faster than eager two-op version.  
**Measure.** Speedup and bytes moved vs theoretical  
**Pitfalls.** Accumulating in bf16  

### Triton matmul with autotuning and L2 swizzle
`inf-triton-matmul-autotune` · Y2 · level 3 · 5 h · Triton, PyTorch

**Goal.** A Triton fp16 matmul with grouped program ordering and an autotune config table.  
**Approach.** Write blocked matmul kernel → Add grouped ordering for L2 reuse → Autotune tile sizes and stages → Compare to cuBLAS across shapes  
**Done when.** Reaches at least 70% of cuBLAS on 4096^3 and tuning table is saved.  
**Measure.** TFLOP/s vs cuBLAS over 5 shapes  
**Pitfalls.** Tuning on only square shapes  

### Fused RoPE + KV write kernel in Triton
`inf-triton-rope-fusion` · Y2 · level 3 · 4 h · Triton, PyTorch

**Goal.** A kernel applying rotary embedding to Q and K and writing K,V into a paged cache in one launch.  
**Approach.** Write RoPE kernel → Add scatter into block-table addressed cache → Test vs unfused PyTorch → Benchmark launch savings  
**Done when.** Cache contents equal the unfused reference bit-for-bit in fp16.  
**Measure.** Time vs 3-kernel baseline  
**Pitfalls.** Position offsets in decode  

### Vectorized exp and softmax on CPU
`inf-avx2-softmax-exp` · Y2 · level 3 · 5 h · C++20, AVX2 or NEON intrinsics

**Goal.** A polynomial-approximation vector exp and softmax with measured error and speed.  
**Approach.** Range-reduce and fit polynomial → Implement in intrinsics → Measure ULP error vs libm → Benchmark softmax rows  
**Done when.** Max relative error under 1e-6 on [-20,0] and at least 4x faster than std::exp loop.  
**Measure.** ULP error and ns per element  
**Pitfalls.** Denormals slowing the loop  

### Cache-blocked fp32 GEMM and roofline fit
`inf-cpu-gemm-blocking` · Y2 · level 3 · 6 h · C++20, perf, OpenMP

**Goal.** A GEMM progressing from naive loops to blocking, packing and threading with a roofline plot.  
**Approach.** Naive ijk and loop reorder → Block for L1/L2 → Pack panels and vectorize micro-kernel → Plot against measured peaks  
**Done when.** Reaches at least 50% of measured single-core FMA peak.  
**Measure.** GFLOP/s per stage and percent of peak  
**Pitfalls.** Packing cost ignored at small sizes  

### Benchmark runner with statistical comparison
`inf-bench-stats-tool` · Y2 · level 3 · 5 h · Python, scipy

**Goal.** A CLI that runs benchmark commands, discards warmup, and reports bootstrap confidence intervals on speedup.  
**Approach.** Run N interleaved trials of A and B → Compute median and bootstrap CI → Detect bimodal results → Output a markdown report  
**Done when.** Correctly flags a 3% real difference and a null comparison on a noisy machine.  
**Measure.** CI width and false-positive rate on null runs  
**Pitfalls.** Running A then B in sequence  

### Measure your own machine's roofline
`inf-measured-roofline` · Y2 · level 3 · 5 h · CUDA C++ or C++, matplotlib

**Goal.** Microbenchmarks for peak FLOPs and peak bandwidth and a roofline plot with real kernels overlaid.  
**Approach.** Write FMA throughput kernel → Write STREAM-like bandwidth kernel → Place 4 of your kernels on the plot → Explain gaps  
**Done when.** Measured peaks within 10% of spec and each kernel point is explained.  
**Measure.** Peak FLOP/s, peak GB/s, ridge point  
**Pitfalls.** Clock throttling during runs  

### Inspect torch.compile output for a transformer block
`inf-inductor-inspect` · Y2 · level 3 · 4 h · PyTorch 2.x, Triton

**Goal.** A write-up mapping generated Triton kernels back to eager ops, with fusion decisions explained.  
**Approach.** Compile a block with output code enabled → List generated kernels → Map each to source ops → Find one missed fusion and test a manual fix  
**Done when.** Write-up covers every generated kernel and measures one manual improvement.  
**Measure.** Kernel count eager vs compiled and speedup  
**Pitfalls.** Dynamic shapes causing recompiles  

### GGUF parser and block dequantization
`inf-gguf-parser-dequant` · Y2 · level 3 · 5 h · Python or Rust

**Goal.** A reader for a quantized model file that dequantizes Q4 and Q8 block types and checks against reference.  
**Approach.** Parse header and tensor table → Implement Q8 and Q4 block layouts → Dequantize a tensor → Compare to reference runtime output  
**Done when.** Dequantized tensor matches the reference runtime within block rounding for 2 formats.  
**Measure.** Max abs diff per format  
**Pitfalls.** Endianness and block scale dtype  

### Padding waste vs sequence packing in batches
`inf-padding-vs-packing` · Y2 · level 3 · 3 h · Python, PyTorch

**Goal.** An experiment measuring wasted FLOPs from padding and gains from ragged packing with varlen attention.  
**Approach.** Sample request lengths from a real distribution → Compute padded vs packed tokens → Run varlen attention vs padded SDPA → Report speedup  
**Done when.** Measured speedup tracks the predicted token ratio within 20%.  
**Measure.** Padding waste percent and speedup  
**Pitfalls.** Mask cost on packed batches  

### CUDA graphs vs eager launch overhead for decode
`inf-cuda-graphs-launch` · Y2 · level 3 · 4 h · PyTorch, CUDA graphs

**Goal.** A measurement of per-step launch overhead and speedup from graph capture for small-batch decode.  
**Approach.** Profile CPU launch gaps → Capture a decode step in a graph → Handle static buffers → Compare across batch sizes  
**Done when.** Graph replay faster at batch 1 with identical logits.  
**Measure.** Step time eager vs graph at batch 1,8,64  
**Pitfalls.** Dynamic shapes breaking capture  

### Overlapping copy and compute with streams
`inf-cuda-streams-overlap` · Y2 · level 3 · 4 h · CUDA C++, Nsight Systems

**Goal.** A pipeline chunking a large job across streams with pinned memory and a timeline proving overlap.  
**Approach.** Baseline synchronous copy-compute-copy → Use pinned memory and 4 streams → Verify overlap in Nsight Systems → Tune chunk size  
**Done when.** Timeline shows overlap and total time falls to near max(copy, compute).  
**Measure.** Total time vs chunk size  
**Pitfalls.** Pageable host memory serializes copies  

### Single-pass decoupled look-back scan
`inf-cuda-scan-lookback` · Y2 · level 4 · 6 h · CUDA C++

**Goal.** A device-wide prefix scan with decoupled look-back compared to a three-kernel scan and thrust.  
**Approach.** Implement three-kernel scan baseline → Add per-tile status flags and look-back → Verify memory-ordering with stress tests → Compare to cub/thrust  
**Done when.** Correct on 1e3 random sizes up to 2^28 and within 2x of thrust.  
**Measure.** GB/s vs thrust  
**Pitfalls.** Missing fences causing rare wrong results  

### GPU radix sort from histogram and scan
`inf-cuda-radix-sort` · Y2 · level 4 · 7 h · CUDA C++

**Goal.** A 32-bit key-value radix sort using your own histogram and scan kernels.  
**Approach.** Per-block digit histograms → Global scan of digit counts → Stable scatter with local ranking → Compare to thrust::sort  
**Done when.** Sorted output equals std::sort on 1e7 keys and stays stable for key-value pairs.  
**Measure.** Mkeys/s vs thrust  
**Pitfalls.** Unstable local ranking  

### Int4 dequant GEMV kernel in Triton for decode
`inf-triton-int4-gemv` · Y2 · level 4 · 6 h · Triton, PyTorch

**Goal.** A weight-only int4 GEMV kernel with group scales that beats fp16 at batch 1.  
**Approach.** Pack 8 int4 values per int32 → Fuse unpack, scale and dot → Verify vs dequantized torch matmul → Benchmark at batch 1-8  
**Done when.** Max error under tolerance and at least 2x faster than fp16 GEMV at batch 1.  
**Measure.** Speedup and effective GB/s  
**Pitfalls.** Unpack order mismatch with scales  

### GPU top-k / top-p sampler without sorting
`inf-gpu-topk-topp-sampler` · Y2 · level 4 · 6 h · Triton or CUDA C++

**Goal.** A batched sampler with temperature, top-k and top-p that avoids a full vocab sort.  
**Approach.** Implement top-k via partial selection → Add top-p via threshold search → Statistically test the sampled distribution → Benchmark vs torch sort path  
**Done when.** Chi-square test passes against reference distribution and runs faster than sort at vocab 128k.  
**Measure.** Microseconds per batch of 64  
**Pitfalls.** Ties at threshold  

### Paged attention decode kernel
`inf-paged-attn-decode-kernel` · Y2 · level 4 · 8 h · CUDA C++ or Triton

**Goal.** A single-token decode attention kernel reading K,V through a block table.  
**Approach.** Write contiguous decode attention → Add block-table indirection → Support GQA head mapping → Compare to a gather+SDPA reference  
**Done when.** Matches reference within 1e-3 over random block layouts and ragged lengths.  
**Measure.** GB/s vs KV bytes theoretical  
**Pitfalls.** Reading past sequence length in last block  

### ARM NEON int8 dot product kernel
`inf-neon-int8-dot` · Y2 · level 4 · 5 h · C, NEON intrinsics, Android or Apple silicon

**Goal.** An int8 GEMV using sdot instructions with a per-row scale, benchmarked on a phone or laptop.  
**Approach.** Scalar reference → NEON widening multiply version → sdot version if available → Benchmark with thermal notes  
**Done when.** sdot version at least 3x scalar and exact for integer accumulation.  
**Measure.** GOPS and GB/s  
**Pitfalls.** Overflow in int16 accumulators  

### Activation outlier study and SmoothQuant migration
`inf-smoothquant-outliers` · Y2 · level 4 · 6 h · PyTorch, small LLM

**Goal.** Per-channel activation statistics and a W8A8 quantization with scale migration, compared to naive W8A8.  
**Approach.** Hook activations and plot channel max → Naive W8A8 perplexity → Apply smoothing factor alpha sweep → Compare perplexity  
**Done when.** Smoothed W8A8 perplexity gap to fp16 at most half of naive gap.  
**Measure.** Perplexity for fp16, naive, smoothed  
**Pitfalls.** Calibration data too small  

### Graph fusion pass on an ONNX-like IR
`inf-graph-fusion-pass` · Y2 · level 4 · 6 h · Python or Rust

**Goal.** A small graph IR with a pass that fuses elementwise chains and conv/matmul+bias+activation patterns.  
**Approach.** Define nodes and shapes → Pattern-match fusable chains → Rewrite graph and verify numerics → Count memory traffic saved  
**Done when.** Fused graph produces identical outputs and reports bytes saved on a small CNN and a transformer block.  
**Measure.** Bytes moved before/after  
**Pitfalls.** Fusing across multi-consumer tensors  

### Generate fused CUDA kernels from expression graphs
`inf-elementwise-codegen` · Y2 · level 4 · 7 h · Python, NVRTC or Triton

**Goal.** A tool that turns an elementwise expression DAG into a single fused kernel compiled at runtime.  
**Approach.** Parse expression DAG → Emit kernel source with vectorized loads → Compile with NVRTC and cache → Benchmark vs eager chain  
**Done when.** Fused kernel output matches eager for 5 expressions and is faster by roughly the traffic ratio.  
**Measure.** Speedup vs predicted traffic ratio  
**Pitfalls.** Broadcast shape handling  

### Pipeline schedule simulator: GPipe, 1F1B, interleaved
`inf-pipeline-schedule-sim` · Y3 · level 3 · 5 h · Python, matplotlib

**Goal.** A simulator that draws timelines and reports bubbles and peak activation memory per schedule.  
**Approach.** Model stages, microbatches, fwd/bwd durations → Implement three schedules → Render Gantt charts → Report memory per stage  
**Done when.** Bubble fractions match closed forms and 1F1B shows lower peak memory than GPipe.  
**Measure.** Bubble % and peak in-flight microbatches  
**Pitfalls.** Equal fwd and bwd durations hide effects  

### Sustained on-device inference thermal study
`inf-edge-thermal-bench` · Y3 · level 3 · 4 h · Phone or laptop, llama.cpp-style runtime

**Goal.** A 30-minute sustained decode benchmark showing throughput decay and power or temperature.  
**Approach.** Script a continuous generation loop → Log tokens/s per minute and temperature → Test two thread counts → Report sustainable settings  
**Done when.** Chart of tokens/s over 30 minutes and recommended sustained thread count.  
**Measure.** Initial vs steady-state tokens/s  
**Pitfalls.** Measuring only burst performance  

### Split-KV flash decoding for long contexts
`inf-flash-decode-splitk` · Y3 · level 4 · 7 h · Triton, PyTorch

**Goal.** A decode kernel splitting the KV sequence across blocks with a log-sum-exp merge.  
**Approach.** Baseline one block per head → Split KV into chunks with partial outputs → Merge with LSE rescale → Sweep context lengths  
**Done when.** Speedup over unsplit kernel at 64k context at batch 1 with identical output.  
**Measure.** Latency vs context length for both kernels  
**Pitfalls.** Merge numerical error  

### NCCL collectives microbenchmark and algorithm fit
`inf-nccl-microbench` · Y3 · level 4 · 5 h · NCCL, PyTorch distributed, 2+ GPUs

**Goal.** A sweep of all-reduce, all-gather, reduce-scatter across sizes with an alpha-beta model fit.  
**Approach.** Run collectives from 1KB to 1GB → Fit latency alpha and bandwidth beta → Compare busbw to link spec → Test ring vs tree via env  
**Done when.** Fitted model predicts held-out sizes within 15%.  
**Measure.** alpha, beta and busbw per collective  
**Pitfalls.** Warmup omitted for first call  

### Ring all-reduce over sockets from scratch
`inf-ring-allreduce-sockets` · Y3 · level 4 · 6 h · Python or Rust, TCP sockets

**Goal.** A multi-process ring all-reduce with chunking and a throughput comparison to a naive gather-broadcast.  
**Approach.** Set up ring topology → Implement reduce-scatter then all-gather → Chunk to overlap send/recv → Compare to naive  
**Done when.** Results match numpy sum for 4 ranks and ring beats naive on 100MB tensors.  
**Measure.** Time vs size for both  
**Pitfalls.** Deadlock from blocking sends  

### Discrete-event LLM serving simulator
`inf-serving-event-sim` · Y3 · level 4 · 7 h · Python, simpy or custom heap

**Goal.** A simulator of arrival, prefill, decode and batching with TTFT, TPOT and goodput outputs.  
**Approach.** Model costs from a measured step-time curve → Generate Poisson arrivals with real length distributions → Implement static and continuous batching policies → Plot SLO attainment  
**Done when.** Simulated tokens/s within 15% of a real server run for one workload.  
**Measure.** TTFT p50/p99 and goodput vs request rate  
**Pitfalls.** Uncalibrated step-time model  

### Chunked prefill tradeoff study
`inf-chunked-prefill-sim` · Y3 · level 4 · 5 h · Python

**Goal.** A study of chunk size effect on TTFT of new requests and TPOT of running ones.  
**Approach.** Extend a simulator with chunked prefill → Sweep chunk sizes 128-8192 → Plot TPOT stalls vs TTFT → Pick a chunk size per SLO  
**Done when.** Plot shows the Pareto curve and recommends a chunk size for a stated SLO.  
**Measure.** TTFT p99 and TPOT p99 per chunk size  
**Pitfalls.** Ignoring attention cost growth with context  

### Length-prediction scheduling study
`inf-length-aware-scheduler` · Y3 · level 4 · 6 h · Python, scikit-learn

**Goal.** A comparison of FCFS, SJF with a predicted output length and oracle scheduling in simulation.  
**Approach.** Train a length predictor on a chat dataset → Plug prediction into scheduler → Compare to FCFS and oracle → Test with prediction noise  
**Done when.** Reports latency improvement of predicted SJF vs FCFS and its sensitivity to error.  
**Measure.** Mean and p99 latency per policy  
**Pitfalls.** Starvation of long requests  

### GPU fleet autoscaler simulator
`inf-autoscaler-sim` · Y3 · level 4 · 5 h · Python

**Goal.** A simulator comparing reactive, queue-based and predictive autoscaling on a bursty trace.  
**Approach.** Generate diurnal plus burst traffic → Model cold start time for replicas → Implement three policies → Score SLO miss and GPU-hours  
**Done when.** Policy comparison table showing cost vs SLO misses with cold start of 60s and 300s.  
**Measure.** GPU-hours and SLO violation percent  
**Pitfalls.** Cold start ignored  

### FP8 matmul scaling strategies
`inf-fp8-scaling-study` · Y3 · level 4 · 6 h · PyTorch, an FP8-capable GPU

**Goal.** A study of per-tensor, per-row and delayed scaling on error and speed for fp8 linear layers.  
**Approach.** Emulate fp8 quant with scales → Run real fp8 matmul if available → Measure layer error on real activations → Compare strategies  
**Done when.** Error table for 3 scaling strategies on 3 layers with a recommended default.  
**Measure.** Relative error per strategy  
**Pitfalls.** Amax history too short  

### Tree attention masks for speculative candidates
`inf-tree-attention-mask` · Y3 · level 4 · 5 h · PyTorch or Triton

**Goal.** A batched tree-verification attention that checks a draft tree in one forward with ancestor masks.  
**Approach.** Build tree-structured position ids → Construct ancestor mask → Verify vs sequential decode logits → Time vs sequential  
**Done when.** Tree logits equal sequential verification for 20 random trees.  
**Measure.** Speedup for tree size 8 and 32  
**Pitfalls.** Position ids wrong for branches  

### Layer-by-layer weight offload from CPU
`inf-layer-offload-streaming` · Y3 · level 4 · 6 h · PyTorch, pinned memory, CUDA streams

**Goal.** A runner that streams layers over PCIe with prefetch to run a model larger than VRAM.  
**Approach.** Place weights in pinned CPU memory → Prefetch layer i+1 on a copy stream → Run decode and prefill modes → Model the PCIe bound  
**Done when.** Runs a model larger than VRAM and throughput matches the PCIe model within 25%.  
**Measure.** Tokens/s vs prediction  
**Pitfalls.** Prefetch not overlapping  

### 2:4 structured sparsity accuracy and speed
`inf-sparse24-study` · Y3 · level 4 · 6 h · PyTorch, sparse tensor cores

**Goal.** Prune a small model to 2:4, fine-tune briefly and measure accuracy and kernel speedup.  
**Approach.** Apply magnitude 2:4 pruning → Brief recovery fine-tune → Convert to semi-structured tensors → Benchmark linear layers  
**Done when.** Perplexity delta and measured layer speedup reported for 3 layer shapes.  
**Measure.** Perplexity delta and speedup  
**Pitfalls.** Speedups missing at small shapes  

### Read PTX and SASS for a GEMM inner loop
`inf-ptx-sass-reading` · Y3 · level 4 · 4 h · CUDA C++, cuobjdump, Nsight Compute

**Goal.** An annotated PTX/SASS walkthrough of a tiled GEMM inner loop showing loads, FMAs and register use.  
**Approach.** Compile a tiled GEMM kernel → Dump PTX and SASS → Annotate the inner loop instructions → Change unroll and compare instruction counts  
**Done when.** Annotation identifies FMA count per iteration and one inefficiency fixed with measured gain.  
**Measure.** Instructions per FMA before/after  
**Pitfalls.** Compiler reordering hides the source mapping  

## low-level

### JSON parser with error positions
`low-w-json-parser-py` · Y1-P0 · level 2 · 3 h · Python 3

**Goal.** A recursive-descent JSON parser that passes the standard conformance cases.  
**Approach.** Tokenize strings, numbers, literals → Recursive descent for values → Error messages with line and column → Run a conformance corpus  
**Done when.** Passes 95 percent of a public-style accept/reject corpus you assemble (at least 60 cases).  
**Measure.** Corpus pass rate and parse MB/s  
**Pitfalls.** Unicode escapes and surrogate pairs; Number grammar edge cases; Deep nesting recursion  

### Markdown subset to HTML converter
`low-w-markdown-html` · Y1-P0 · level 2 · 4 h · Python 3

**Goal.** A converter for headings, lists, emphasis, code, links with an AST stage.  
**Approach.** Block parser to AST → Inline parser for emphasis and links → HTML renderer with escaping → Test with a spec-like corpus  
**Done when.** Passes 60 hand-written cases and escapes all HTML in user text.  
**Measure.** Cases passing  
**Pitfalls.** Nested emphasis ambiguity; Escaping order  

### Stack bytecode VM and assembler
`low-w-stack-vm-py` · Y1-P0 · level 3 · 4 h · Python 3

**Goal.** A small stack VM with an assembler, labels, calls and a disassembler.  
**Approach.** Define 20 opcodes → Write an assembler with labels → Implement call frames → Write fib and sieve programs  
**Done when.** fib(25) and a prime sieve run correctly; disassembler output re-assembles identically.  
**Measure.** Instructions per second  
**Pitfalls.** Stack underflow checks; Label back-patching  

### Unified diff and patch tool
`low-w-unified-diff-patch` · Y1-P0 · level 3 · 5 h · Python 3

**Goal.** A diff that emits unified hunks and a patch that applies them.  
**Approach.** Line diff with context hunks → Hunk header arithmetic → Patch with offset and fuzz tolerance → Round-trip test  
**Done when.** diff then patch reproduces target on 50 random file pairs; GNU patch accepts your diff.  
**Measure.** Round-trip success rate  
**Pitfalls.** Hunk line counts; Missing newline at EOF marker  

### Five coreutils clones in C
`low-w-c-coreutils` · Y1-P1 · level 2 · 5 h · C11, POSIX

**Goal.** cat, wc, head, tail -f and tee clones with correct flags and exit codes.  
**Approach.** Argument parsing with getopt → Buffered IO with read/write → tail -f with polling or inotify → Compare outputs with GNU tools  
**Done when.** Outputs match GNU versions byte-for-byte on 20 test invocations.  
**Measure.** Matching invocations out of 20  
**Pitfalls.** Binary files and missing newline; SIGPIPE handling  

### PageRank and random walk simulation
`low-w-pagerank-markov` · Y1-P1 · level 2 · 3 h · Python, NumPy

**Goal.** PageRank via power iteration confirmed by random-walk simulation.  
**Approach.** Build a link graph → Power iteration with damping → Simulate a random surfer → Compare rankings  
**Done when.** Top-10 ranking agrees between analytic and simulated within sampling error.  
**Measure.** L1 distance between distributions  
**Pitfalls.** Dangling nodes; Convergence criteria  

### Recursive-descent parser and evaluator in C
`low-w-c-calc-parser` · Y1-P1 · level 3 · 5 h · C11

**Goal.** A calculator with variables, functions and an AST with memory freed cleanly.  
**Approach.** Lexer and AST node structs → Pratt or precedence climbing → Evaluator with symbol table → Free AST, run valgrind  
**Done when.** 50 expressions evaluate correctly; valgrind reports zero leaks.  
**Measure.** Expressions per second  
**Pitfalls.** AST ownership; Error recovery  

### Allocation-aware JSON parser in C
`low-w-c-json-parser` · Y1-P1 · level 3 · 6 h · C11

**Goal.** A JSON parser storing values in an arena with a tiny query API.  
**Approach.** Arena for nodes → Streaming-free recursive parser → Path query like a.b[2] → Fuzz with random mutations  
**Done when.** Parses a 50 MB file with zero leaks and no crashes in 100k fuzz cases.  
**Measure.** MB/s parse speed  
**Pitfalls.** Stack depth limits; Integer overflow in sizes  

### Slab pool allocator benchmark
`low-w-cpp-slab-allocator` · Y1-P1 · level 3 · 5 h · C++20

**Goal.** A fixed-size-class pool allocator benchmarked against malloc.  
**Approach.** Free-list slab per size class → Thread-local caches → Benchmark mixed alloc/free workloads → Check fragmentation  
**Done when.** Beats malloc by a reported margin on a 16-64 byte churn workload and passes ASan.  
**Measure.** ns per alloc/free vs malloc  
**Pitfalls.** Alignment; Cross-thread frees  

### Sudoku via Dancing Links
`low-w-sudoku-dlx` · Y1-P1 · level 3 · 4 h · C++20

**Goal.** An exact cover solver using DLX solving Sudoku and N-queens.  
**Approach.** Build the toroidal linked matrix → Algorithm X with cover/uncover → Encode Sudoku as exact cover → Time hard puzzles  
**Done when.** Solves 100 hard Sudokus, each valid, at under 10 ms median.  
**Measure.** Median solve ms  
**Pitfalls.** Uncover order; Choosing the min-size column  

### Thread pool with futures
`low-w-cpp-thread-pool` · Y1-P1 · level 3 · 5 h · C++20

**Goal.** A thread pool returning std::future results with work-stealing deques optional.  
**Approach.** Task queue guarded by mutex → packaged_task and future → Graceful shutdown → Parallel sum benchmark  
**Done when.** Parallel mergesort over 10M ints is faster than serial and tsan reports no races.  
**Measure.** Speedup at 1, 2, 4, 8 threads  
**Pitfalls.** Deadlock on shutdown; Exception propagation  

### epoll static file server
`low-w-epoll-http` · Y1-P1 · level 3 · 7 h · C, Linux

**Goal.** A non-blocking HTTP/1.1 server handling keep-alive with epoll.  
**Approach.** Non-blocking sockets and edge-triggered epoll → Parse requests incrementally → Serve files with sendfile → Load test with wrk or ab  
**Done when.** Sustains 1,000 concurrent connections serving a static file with zero errors.  
**Measure.** Requests per second  
**Pitfalls.** Partial writes; Edge-triggered starvation  

### Iterative DNS resolver
`low-w-dns-resolver` · Y1-P1 · level 3 · 5 h · Python or Go

**Goal.** A resolver walking from root hints to authoritative answers with caching.  
**Approach.** Query builder and parser → Follow NS and glue records → CNAME chasing → TTL cache  
**Done when.** Resolves 20 domains matching the system resolver, with cache hits on repeat.  
**Measure.** Domains matching and avg lookup ms  
**Pitfalls.** Missing glue; CNAME loops  

### FFT spectrogram of audio
`low-w-spectrogram` · Y1-P1 · level 3 · 4 h · Python, NumPy

**Goal.** A STFT spectrogram of a WAV file with windowing and overlap.  
**Approach.** Read WAV samples → Hann window and overlapped frames → FFT per frame → Render PNG with log magnitude  
**Done when.** A synthetic two-tone signal shows peaks within one bin of its true frequencies.  
**Measure.** Peak frequency error in Hz  
**Pitfalls.** Spectral leakage; Wrong bin to Hz mapping  

### LU, QR and Cholesky with conditioning study
`low-w-dense-solvers` · Y1-P1 · level 3 · 6 h · Python, NumPy

**Goal.** From-scratch LU, QR (Householder) and Cholesky with error versus condition number.  
**Approach.** Implement three factorizations → Solve Hilbert systems of growing size → Plot error vs condition number  
**Done when.** Residuals agree with numpy.linalg to 1e-8 on well-conditioned cases; error plot produced.  
**Measure.** Relative error vs condition number  
**Pitfalls.** Householder sign choice; Cholesky on non-SPD input  

### Symbolic differentiation with simplifier
`low-w-symbolic-diff` · Y1-P1 · level 3 · 5 h · Python or Haskell-style ADTs

**Goal.** A differentiator for expression trees with algebraic simplification.  
**Approach.** Expression tree classes → Derivative rules incl. chain rule → Simplification rules to a fixed point → Test with numeric differentiation  
**Done when.** Symbolic derivatives match central differences within 1e-6 at 100 random points.  
**Measure.** Max numeric disagreement  
**Pitfalls.** Expression blow-up; Simplifier non-termination  

### CHIP-8 emulator
`low-w-chip8` · Y1-P1 · level 3 · 8 h · C or Rust, SDL

**Goal.** An emulator that runs community test ROMs.  
**Approach.** Fetch-decode-execute loop → Implement 35 opcodes → Timers and keypad → Run a test ROM suite  
**Done when.** Passes a public opcode test ROM and plays two games.  
**Measure.** Opcodes verified  
**Pitfalls.** Quirk differences between ROMs; Timer rate (60 Hz)  

### Two-pass assembler for a toy ISA
`low-w-two-pass-asm` · Y1-P1 · level 3 · 5 h · Python

**Goal.** An assembler with labels, directives and a listing for a 16-bit toy ISA.  
**Approach.** Define ISA encoding table → Pass one collects labels → Pass two emits bytes → Emit listing and hex  
**Done when.** Assembles 5 sample programs that run correctly in a reference emulator.  
**Measure.** Programs assembled correctly  
**Pitfalls.** Forward references; Immediate range errors  

### Lock-free SPSC queue
`low-w-spsc-queue` · Y1-P1 · level 4 · 5 h · C++20

**Goal.** A single-producer single-consumer ring queue with cache-line padding.  
**Approach.** Atomic head/tail with acquire/release → Pad to avoid false sharing → Compare with mutex queue → Test with tsan  
**Done when.** 10M items pass in order across threads; throughput reported vs mutex queue.  
**Measure.** Items per second vs mutex  
**Pitfalls.** Memory ordering mistakes; False sharing  

### Pratt parser in Rust
`low-w-rust-pratt` · Y2 · level 3 · 4 h · Rust

**Goal.** A Pratt parser producing an AST with spans and pretty errors.  
**Approach.** Tokenizer with spans → Binding power table → AST enum and Display → Error reporting with source snippet  
**Done when.** Parses 40 expressions to expected S-expressions; errors underline the offending span.  
**Measure.** Test cases passing  
**Pitfalls.** Associativity; Span bookkeeping  

### Mini ripgrep clone
`low-w-rust-ripgrep` · Y2 · level 3 · 7 h · Rust

**Goal.** A recursive grep with gitignore-style skipping, regex and parallel walk.  
**Approach.** Directory walk and ignore rules → Use the regex crate with line scanning → Parallelise with threads → Benchmark against grep  
**Done when.** Finds identical matches to grep -rn on a large source tree and reports speedup.  
**Measure.** Seconds vs grep -r  
**Pitfalls.** Binary file detection; Ignore rule precedence  

### Packet dissector for Ethernet to TCP
`low-w-pcap-dissector` · Y2 · level 3 · 5 h · Python or Rust

**Goal.** A dissector printing layered Ethernet/IP/TCP/UDP fields with flow statistics.  
**Approach.** Parse layers by header → TCP flow reassembly basics → Per-flow byte counts → Compare to tshark output  
**Done when.** Flow table equals a reference tool on a 10k-packet capture.  
**Measure.** Packets parsed, flows matched  
**Pitfalls.** IP options and header length; Checksum offload artifacts  

### ELF header and symbol reader
`low-w-elf-reader` · Y2 · level 3 · 4 h · C or Python

**Goal.** A readelf-like tool for headers, sections, segments and symbols.  
**Approach.** Parse ELF64 header → Walk section and program headers → Read symbol table and string tables → Diff against readelf  
**Done when.** Matches readelf -h -S -s output on 5 binaries.  
**Measure.** Fields matching readelf  
**Pitfalls.** Endianness and class; String table offsets  

### FAT32 image reader
`low-w-fat32-reader` · Y2 · level 3 · 6 h · C

**Goal.** A read-only FAT32 tool listing directories and extracting files from an image.  
**Approach.** Parse boot sector → Follow FAT cluster chains → Handle long file names → Extract and checksum files  
**Done when.** Extracted files match checksums from the mounted image for 10 files.  
**Measure.** Files extracted correctly  
**Pitfalls.** LFN ordering; Cluster to sector mapping  

### Make-style build tool
`low-w-make-clone` · Y2 · level 3 · 6 h · Python or Go

**Goal.** A build tool with targets, dependencies, mtime checks and parallel jobs.  
**Approach.** Parse a simple Makefile subset → Topological sort → Rebuild by timestamp → Parallel execution with -j  
**Done when.** Rebuilds only changed targets on a 50-file project and detects cycles.  
**Measure.** Targets rebuilt after one-file touch  
**Pitfalls.** Cycle detection; Racy mtime resolution  

### Gradient descent to L-BFGS comparison
`low-w-lbfgs` · Y2 · level 3 · 5 h · Python, NumPy

**Goal.** Optimisers compared on Rosenbrock and a logistic regression objective.  
**Approach.** Gradient descent with line search → Momentum and Newton-CG or BFGS → L-BFGS two-loop → Iteration and function-eval counts  
**Done when.** L-BFGS reaches 1e-8 gradient norm in fewer evaluations than gradient descent on both problems.  
**Measure.** Function evaluations to tolerance  
**Pitfalls.** Line search conditions; Bad curvature pairs  

### HTTP/2 frame parser and stream state
`low-w-http2-frames` · Y2 · level 4 · 6 h · Rust or Go

**Goal.** A frame decoder and stream state machine verified on captured traffic.  
**Approach.** Parse the 9-byte frame header and types → Stream state transitions → Flow control windows → Validate against captured frames  
**Done when.** Decodes a captured session and flags 5 intentionally malformed frames.  
**Measure.** Frames decoded and errors caught  
**Pitfalls.** Window update overflow; Stream id parity  

### HPACK header compression
`low-w-hpack` · Y2 · level 4 · 5 h · Rust or Python

**Goal.** An HPACK encoder and decoder with a dynamic table and Huffman.  
**Approach.** Static and dynamic tables → Integer prefix coding → Huffman decode → Test with spec examples  
**Done when.** Round-trips the RFC examples and 1,000 random header sets.  
**Measure.** Compression ratio  
**Pitfalls.** Dynamic table size updates; Eviction order  

### TLS 1.3 key schedule from test vectors
`low-w-tls13-keysched` · Y2 · level 4 · 5 h · Python, cryptography primitives

**Goal.** A key schedule using HKDF-Expand-Label verified on RFC-style traces.  
**Approach.** Implement HKDF extract/expand → Derive handshake and traffic secrets → Decrypt a recorded handshake record → Compare with known vector  
**Done when.** Derived secrets equal the published test-vector values.  
**Measure.** Secrets matching  
**Pitfalls.** HkdfLabel encoding; Transcript hash timing  

### Actor runtime with supervision
`low-w-go-actor-runtime` · Y2 · level 4 · 6 h · Go

**Goal.** Actors with mailboxes, ask/tell and one-for-one supervisors.  
**Approach.** Mailbox goroutine per actor → Message routing by address → Supervisor restart policy → Chaos test with panics  
**Done when.** Chaos test with 100 crashing actors completes with all restarts and no deadlock.  
**Measure.** Messages per second  
**Pitfalls.** Mailbox backpressure; Restart storms  

### Minimal async executor in Rust
`low-w-rust-mini-executor` · Y2 · level 4 · 7 h · Rust

**Goal.** A single-threaded executor with wakers, a timer and a channel.  
**Approach.** Implement Future polling loop → Custom Waker via RawWaker or Arc wake → Timer wheel → Join several tasks  
**Done when.** Runs 10,000 timer tasks in correct order with no busy-wait CPU spin.  
**Measure.** CPU percent while idle  
**Pitfalls.** Lost wakeups; Pinning rules  

### strace clone using ptrace
`low-w-ptrace-strace` · Y2 · level 4 · 6 h · C, Linux x86-64

**Goal.** A tracer printing syscall names, args and returns for a child process.  
**Approach.** PTRACE_TRACEME and syscall stops → Read registers for number and args → Decode a table of 30 syscalls → Handle fork follow  
**Done when.** Output matches strace on 5 simple programs for syscall order.  
**Measure.** Syscalls decoded correctly  
**Pitfalls.** Entry vs exit stops; Reading strings from tracee memory  

### Mark-sweep garbage collector
`low-w-mark-sweep-gc` · Y2 · level 4 · 6 h · C

**Goal.** A precise mark-sweep GC for a tiny object heap with roots and stress mode.  
**Approach.** Object header with mark bit → Root set and trace → Sweep to free list → Stress GC every allocation  
**Done when.** Stress mode runs a linked-structure workload with no live object freed.  
**Measure.** Objects collected and pause ms  
**Pitfalls.** Missing roots on the C stack; Cycles  

### Hindley-Milner type inference
`low-w-hindley-milner` · Y2 · level 4 · 7 h · Python or OCaml-like

**Goal.** Algorithm W for a tiny lambda calculus with let polymorphism.  
**Approach.** AST for lambda, let, if → Unification with occurs check → Generalise and instantiate → Test known typings  
**Done when.** Infers correct types for 30 expressions and rejects 10 ill-typed ones.  
**Measure.** Cases passing  
**Pitfalls.** Generalisation over environment variables; Occurs check  

### WebAssembly binary decoder and interpreter core
`low-w-wasm-decoder` · Y2 · level 4 · 8 h · Rust or C

**Goal.** A decoder and stack interpreter for integer WebAssembly functions.  
**Approach.** LEB128 and section parsing → Decode function bodies → Structured control flow with labels → Run compiled factorial and fib  
**Done when.** Runs fib and factorial modules compiled from a reference compiler with correct results.  
**Measure.** Test modules passing  
**Pitfalls.** Block label depth; Signed LEB128  

### In-memory FUSE file system
`low-w-fuse-memfs` · Y2 · level 4 · 6 h · C or Rust, FUSE

**Goal.** A FUSE-mounted RAM file system with directories, read/write and rename.  
**Approach.** Inode table and directory entries → Implement getattr, readdir, read, write → Rename and unlink semantics → Run a POSIX test script  
**Done when.** Passes a script of 30 file operations and fsstress for 60 seconds.  
**Measure.** Operations passing  
**Pitfalls.** Link counts; Truncate and sparse writes  

### MPMC queue designs benchmarked
`low-w-mpmc-bench` · Y3 · level 4 · 7 h · C++20

**Goal.** Three MPMC queues (mutex, ticketed ring, linked) benchmarked across thread counts.  
**Approach.** Implement each queue → Common benchmark harness → Pin threads and vary producers/consumers → Analyse cache misses with perf  
**Done when.** Throughput table for 1-16 threads with a written explanation of the winner.  
**Measure.** Ops/s per design and thread count  
**Pitfalls.** Benchmark noise from frequency scaling; Padding  

### Regex to minimal DFA
`low-w-regex-dfa` · Y3 · level 4 · 6 h · Python or Rust

**Goal.** A regex compiler through NFA, subset construction and Hopcroft minimisation.  
**Approach.** Parse to AST → Thompson NFA → Subset construction → Minimise and match linearly  
**Done when.** Agrees with a reference engine on 500 random strings for 20 regexes and runs linear time.  
**Measure.** Agreement rate and state counts  
**Pitfalls.** State explosion; Anchors and classes  

### Sparse matrices and conjugate gradient
`low-w-cg-sparse` · Y3 · level 4 · 6 h · C++20 or Python

**Goal.** CSR storage and CG with preconditioning for a 2D Poisson problem.  
**Approach.** CSR build and SpMV → Conjugate gradient → Jacobi and incomplete Cholesky preconditioner → Iteration counts vs grid size  
**Done when.** Solves 512x512 Poisson to 1e-8 residual; iteration counts reported per preconditioner.  
**Measure.** Iterations and seconds per preconditioner  
**Pitfalls.** Loss of orthogonality; Indexing in CSR  

### Importance sampling and quasi-Monte Carlo study
`low-w-importance-sampling` · Y3 · level 4 · 5 h · Python, NumPy

**Goal.** A comparison of plain MC, importance sampling and Sobol on tough integrals.  
**Approach.** Pick 3 integrals with peaks or tails → Implement estimators → Estimate variance and convergence rate → Plot error vs samples  
**Done when.** Plots show Sobol and importance sampling beating plain MC with fitted slopes reported.  
**Measure.** Convergence slope per method  
**Pitfalls.** Biased proposals; Weight variance blow-up  

## services

### REST API with Postgres and migrations
`svc-rest-api-postgres-migrations` · Y1-P0 · level 2 · 4 h · FastAPI, PostgreSQL, Alembic, pytest

**Goal.** A tested CRUD service with versioned schema migrations and pagination.  
**Approach.** Model users and posts with foreign keys → Write Alembic migrations including a data backfill → Add pagination and filtering → Test against a throwaway database  
**Done when.** Fresh database reaches current schema from migrations and test suite passes.  
**Measure.** Test coverage percent and endpoints  
**Pitfalls.** Editing applied migrations; Tests sharing state  

### Cookie sessions with CSRF protection
`svc-sessions-csrf-auth` · Y1-P0 · level 2 · 4 h · FastAPI or Flask, Redis, Argon2

**Goal.** A login system with server-side sessions, secure cookies and CSRF tokens.  
**Approach.** Hash passwords and store sessions in Redis → Set HttpOnly, Secure and SameSite cookies → Add double-submit CSRF tokens → Write a forged cross-site request test  
**Done when.** Forged requests fail and session fixation is prevented via ID rotation on login.  
**Measure.** Attack tests passing  
**Pitfalls.** Not rotating session ID at login  

### Star schema analytics with DuckDB
`svc-duckdb-star-schema-analytics` · Y1-P0 · level 2 · 4 h · DuckDB, SQL, Python

**Goal.** A fact and dimension model with ten business queries and timings.  
**Approach.** Design a star schema from a public-style sales dataset → Load via Parquet → Write ten analytic queries with window functions → Compare to a denormalised table  
**Done when.** Ten queries documented with runtimes and a schema diagram.  
**Measure.** Query time at 10M rows  
**Pitfalls.** Joining on non-unique dimension keys  

### Docker Compose stack with API, DB and cache
`svc-compose-api-db-cache-stack` · Y1-P0 · level 2 · 3 h · Docker Compose, Postgres, Redis, FastAPI

**Goal.** One-command local environment with healthchecks and persistent volumes.  
**Approach.** Compose three services with healthchecks → Use depends_on conditions and env files → Add a seed script → Document teardown and reset  
**Done when.** docker compose up gives a working API from a clean checkout.  
**Measure.** Cold start time (s)  
**Pitfalls.** Hard-coding secrets in compose file  

### Full-text search with SQLite FTS5
`svc-sqlite-fts5-search` · Y1-P1 · level 2 · 3 h · SQLite FTS5, Python

**Goal.** A document search service with ranking, snippets and prefix queries.  
**Approach.** Index a text corpus into FTS5 → Query with bm25 ranking and highlight → Add triggers to keep index in sync → Measure query latency  
**Done when.** Searches return ranked snippets in under 20 ms at 100k docs.  
**Measure.** Query latency at 100k docs (ms)  
**Pitfalls.** Index drifting from source table  

### Web performance budget and critical path
`svc-web-performance-budget` · Y1-P1 · level 2 · 4 h · Lighthouse CI, nginx, HTML/JS

**Goal.** A page optimised from a poor score with budgets enforced in CI.  
**Approach.** Measure baseline LCP, CLS and INP → Fix render-blocking, images and caching → Add compression and preload → Enforce budgets in CI  
**Done when.** Lighthouse performance rises 30 points and CI blocks regressions.  
**Measure.** LCP before and after (ms)  
**Pitfalls.** Optimising lab scores only  

### Real-time chat with rooms and presence
`svc-pubsub-chat-rooms` · Y1-P1 · level 3 · 6 h · Python or Node, WebSockets, Redis pub/sub

**Goal.** A multi-process chat server where messages cross instances through a broker.  
**Approach.** Build rooms and join/leave protocol → Fan out through Redis pub/sub → Track presence with heartbeats and TTL keys → Run two instances behind a proxy  
**Done when.** Clients on different instances see each other and ghosts expire in 30 s.  
**Measure.** Fan-out latency p95 (ms)  
**Pitfalls.** Ghost presence after crashes; Unbounded per-client buffers  

### Background job runner with leases and DLQ
`svc-background-job-runner-leases` · Y1-P1 · level 3 · 6 h · Python, PostgreSQL SKIP LOCKED

**Goal.** A job queue with retries, visibility leases and a dead-letter table.  
**Approach.** Create jobs table and claim with SKIP LOCKED → Add lease timeout and heartbeat → Implement retry backoff and DLQ → Kill workers mid-job to test recovery  
**Done when.** Killed workers cause re-delivery and no job is lost or run twice concurrently.  
**Measure.** Jobs per second with 4 workers  
**Pitfalls.** Non-idempotent handlers; Leases shorter than job time  

### OIDC login against Keycloak
`svc-oidc-login-keycloak` · Y1-P1 · level 3 · 5 h · Keycloak, Authlib, FastAPI

**Goal.** An app delegating login to an OIDC provider with validated ID tokens and roles.  
**Approach.** Run Keycloak in Docker and register a client → Implement code flow with PKCE → Validate signature, issuer, audience and nonce → Map roles to route permissions  
**Done when.** Tampered and wrong-audience tokens are rejected.  
**Measure.** Validation checks implemented (count)  
**Pitfalls.** Skipping nonce and audience checks  

### Tracing a FastAPI app with OpenTelemetry
`svc-otel-fastapi-jaeger` · Y1-P1 · level 3 · 3 h · OpenTelemetry, Jaeger, FastAPI, Postgres

**Goal.** A service with automatic and manual spans visible in Jaeger.  
**Approach.** Add auto-instrumentation → Create manual spans with attributes → Find a slow query from its trace → Export metrics too  
**Done when.** A slow endpoint is diagnosed from a trace alone.  
**Measure.** Spans per request  
**Pitfalls.** High-cardinality span attributes  

### Backend-for-frontend aggregator with partial results
`svc-bff-aggregator-partial` · Y1-P1 · level 3 · 5 h · Python asyncio, httpx

**Goal.** An endpoint fanning out to three services with timeouts and graceful degradation.  
**Approach.** Build three mock backends with injected latency → Fan out with per-call timeouts → Return partial data with warnings → Add a hedged request for the slowest call  
**Done when.** Endpoint meets a 300 ms budget while one backend is down.  
**Measure.** p99 with one backend failing (ms)  
**Pitfalls.** Unbounded concurrency; Retry amplification  

### Inverted index and BM25 from scratch
`svc-inverted-index-bm25` · Y1-P1 · level 3 · 7 h · Python or Rust

**Goal.** A search library with tokenisation, postings lists and BM25 ranking evaluated on a test set.  
**Approach.** Build tokenizer and postings with positions → Implement BM25 and phrase queries → Evaluate MRR on labelled queries → Compare to FTS5  
**Done when.** MRR within 10 percent of a reference engine on the same data.  
**Measure.** MRR and index size  
**Pitfalls.** Forgetting document length normalisation  

### GraphQL N+1 elimination with batching
`svc-graphql-dataloader-n-plus-one` · Y1-P1 · level 3 · 4 h · Strawberry or Apollo, DataLoader, Postgres

**Goal.** A GraphQL API whose nested queries issue a constant number of SQL statements.  
**Approach.** Build a schema with nested relations → Count queries per request on a naive resolver → Add DataLoader batching and caching → Add depth and cost limits  
**Done when.** Nested query issues at most 3 SQL statements regardless of list size.  
**Measure.** SQL statements before and after  
**Pitfalls.** Cache shared across requests leaking data  

### CI matrix with release and provenance
`svc-ci-matrix-release-pipeline` · Y1-P1 · level 3 · 4 h · GitHub Actions, Docker, semantic versioning

**Goal.** A pipeline testing a matrix, building an image and cutting tagged releases.  
**Approach.** Test across Python versions → Build and push image with cache → Automate changelog and tags → Fail on vulnerable dependencies  
**Done when.** A tag push produces a signed, versioned image.  
**Measure.** Pipeline duration (min)  
**Pitfalls.** Secrets exposed to pull requests from forks  

### STRIDE threat model of a small system
`svc-stride-threat-model` · Y1-P1 · level 3 · 4 h · Markdown, draw.io, OWASP

**Goal.** A data-flow diagram, threats per element and ranked mitigations for your own app.  
**Approach.** Draw trust boundaries and flows → Apply STRIDE to each element → Score and rank risks → Implement the top three mitigations  
**Done when.** Top three mitigations are implemented with tests.  
**Measure.** Threats identified and mitigated  
**Pitfalls.** Listing threats with no mitigation owner  

### Reverse proxy with health checks
`svc-asyncio-reverse-proxy-health` · Y1-P1 · level 3 · 5 h · Python asyncio

**Goal.** A round-robin HTTP proxy that ejects unhealthy backends and reinstates them.  
**Approach.** Parse requests and forward to backends → Add active health checks → Eject on failure and retry idempotent requests → Test with flapping backends  
**Done when.** No requests routed to a dead backend after the detection window.  
**Measure.** Detection time (s)  
**Pitfalls.** Retrying non-idempotent methods  

### API versioning and deprecation plan
`svc-api-versioning-deprecation` · Y1-P1 · level 3 · 3 h · FastAPI, OpenAPI

**Goal.** Two live API versions with sunset headers, usage metrics and a contract diff in CI.  
**Approach.** Add path-based v1 and v2 → Emit Deprecation and Sunset headers → Count per-version usage → Fail CI on breaking spec changes  
**Done when.** A breaking change to v1 fails CI.  
**Measure.** Breaking changes detected  
**Pitfalls.** Silent behaviour changes in the same version  

### ADR set for a modular monolith
`svc-adr-driven-architecture-review` · Y1-P1 · level 3 · 3 h · Markdown, diagrams

**Goal.** Five ADRs and a module boundary diagram for a real small system.  
**Approach.** List forces and quality attributes → Write ADRs with options and consequences → Define module boundaries and dependency rules → Add an architecture test enforcing them  
**Done when.** A dependency violation fails an automated test.  
**Measure.** ADRs written and rules enforced  
**Pitfalls.** ADRs without rejected alternatives  

### gRPC service with streaming and schema evolution
`svc-grpc-protobuf-service` · Y2 · level 3 · 5 h · gRPC, protobuf, Go or Python

**Goal.** A service with unary and server-streaming calls and a backward-compatible schema change.  
**Approach.** Define messages and services → Implement unary, server and bidirectional streaming → Add a field and verify old clients work → Add interceptors for logging and auth  
**Done when.** Old client talks to new server with an added field.  
**Measure.** Calls per second unary versus streaming  
**Pitfalls.** Reusing field numbers  

### Write your own Helm chart
`svc-helm-chart-own` · Y2 · level 3 · 4 h · Helm, kind, Kubernetes

**Goal.** A reusable chart with values, helpers, config checksums and tests.  
**Approach.** Template deployment, service and ingress → Add values schema validation → Roll pods on config change using a checksum annotation → Run helm test  
**Done when.** helm lint and template pass and upgrade rolls pods on config change.  
**Measure.** Values exposed and validated  
**Pitfalls.** Over-templating everything  

### Webhook delivery service
`svc-webhook-delivery-service` · Y2 · level 3 · 6 h · Python, PostgreSQL, workers

**Goal.** At-least-once webhook delivery with signatures, backoff and a replay UI.  
**Approach.** Store events and subscriptions → Deliver with HMAC signature and timeouts → Retry with exponential backoff and disable dead endpoints → Expose delivery logs  
**Done when.** Flaky receiver eventually gets every event exactly marked delivered.  
**Measure.** Delivery success rate under 30 percent failures  
**Pitfalls.** Blocking workers on slow receivers  

### Feature flag service with percentage rollout
`svc-feature-flag-service` · Y2 · level 3 · 4 h · FastAPI, Redis, SDK in Python

**Goal.** Targeting rules, sticky percentage rollouts and a client SDK with local caching.  
**Approach.** Define flag and rule schema → Hash user IDs for stable buckets → Build an SDK with polling and fallbacks → Verify distribution  
**Done when.** A 20 percent rollout hits 20 percent plus or minus 1 and stays sticky.  
**Measure.** Bucket distribution error  
**Pitfalls.** Re-bucketing users when rules change  

### Security scanning in CI
`svc-ci-security-scanning` · Y2 · level 3 · 3 h · GitHub Actions, Trivy, Semgrep, gitleaks

**Goal.** A pipeline blocking merges on secrets, vulnerable dependencies and risky patterns.  
**Approach.** Add secret scanning with gitleaks → Add dependency and image scanning → Add static analysis rules → Triage findings with documented suppressions  
**Done when.** Planted secret and vulnerable dependency both fail the build.  
**Measure.** Findings caught of planted (3/3)  
**Pitfalls.** Suppressing without expiry  

### Capacity model from load tests
`svc-load-test-capacity-model` · Y2 · level 3 · 5 h · k6, Prometheus, Python

**Goal.** A throughput and latency curve with a knee point and Little's law check.  
**Approach.** Run stepped load tests on your service → Plot throughput, latency and CPU → Find the saturation knee → Validate with L = lambda times W  
**Done when.** Predicted concurrency matches measured within 15 percent.  
**Measure.** Saturation throughput (rps)  
**Pitfalls.** Closed-loop load hiding queueing delay  

### Time partitioning in PostgreSQL
`svc-postgres-partitioning` · Y2 · level 3 · 4 h · PostgreSQL

**Goal.** A partitioned events table with pruning, retention and measured gains.  
**Approach.** Create range partitions by month → Verify pruning in plans → Automate creation and detaching old partitions → Compare to a monolithic table  
**Done when.** Queries on one month scan one partition and drop is instant.  
**Measure.** Scan time versus unpartitioned  
**Pitfalls.** Missing partition key in unique indexes  

### Connection pool sizing experiment
`svc-pgbouncer-pool-sizing` · Y2 · level 3 · 3 h · PgBouncer, PostgreSQL, k6

**Goal.** Throughput measured against pool size with a recommended setting.  
**Approach.** Run load with direct connections → Place PgBouncer in transaction mode → Sweep pool sizes → Plot throughput and tail latency  
**Done when.** A chosen pool size is justified by the curve.  
**Measure.** Throughput at best pool size  
**Pitfalls.** Transaction pooling breaking session state  

### Cache eviction policy simulator
`svc-cache-eviction-simulator` · Y2 · level 3 · 4 h · Python or Rust

**Goal.** LRU, LFU, ARC-style and TinyLFU compared on real-looking traces.  
**Approach.** Implement policies behind one interface → Generate Zipf and scan-heavy traces → Plot hit ratio versus cache size → Explain winners per workload  
**Done when.** Plots show a scan-resistant policy beating LRU on scan traces.  
**Measure.** Hit ratio per policy  
**Pitfalls.** Unrealistic uniform traces  

### Reusable Terraform module with tests
`svc-localstack-terraform-module` · Y2 · level 3 · 5 h · Terraform, LocalStack, terraform test

**Goal.** A module for queue plus bucket with variables, outputs and automated tests.  
**Approach.** Write module with validation rules → Use LocalStack as a target → Add terraform test assertions → Version and consume from a root config  
**Done when.** Module tests pass against LocalStack in CI.  
**Measure.** Assertions in test suite  
**Pitfalls.** Leaking provider config into modules  

### Multi-window burn rate alerts
`svc-burn-rate-alert-rules` · Y2 · level 3 · 3 h · Prometheus, Alertmanager

**Goal.** SLO alerts firing on fast and slow burns with low noise.  
**Approach.** Define availability SLI from metrics → Write 1h and 6h burn rules → Replay synthetic incidents → Tune to avoid flapping  
**Done when.** A 5-minute outage and a slow leak both alert appropriately.  
**Measure.** False pages in a week of replay  
**Pitfalls.** Alerting on causes rather than symptoms  

### Log pipeline with Vector and Loki
`svc-loki-vector-log-pipeline` · Y2 · level 3 · 4 h · Vector, Loki, Grafana, Docker

**Goal.** Logs shipped, parsed, labelled and queried with LogQL.  
**Approach.** Ship container logs with Vector → Parse JSON and set low-cardinality labels → Write LogQL queries and an alert → Measure ingestion rate  
**Done when.** A request ID query finds every related line in under 2 s.  
**Measure.** Ingestion rate (lines per second)  
**Pitfalls.** High-cardinality labels  

### Tumbling and sliding window stream aggregation
`svc-time-window-aggregation` · Y2 · level 3 · 5 h · Python or Rust, event time

**Goal.** Windowed counts with event-time handling, watermarks and late data policy.  
**Approach.** Generate out-of-order events → Implement tumbling and sliding windows → Add watermarks and allowed lateness → Compare results to a batch oracle  
**Done when.** Streaming results match the batch oracle except documented late drops.  
**Measure.** Late events dropped percent  
**Pitfalls.** Using processing time by accident  

### Authorization: RBAC versus ABAC policy engine
`svc-oauth-scopes-rbac-abac` · Y2 · level 3 · 5 h · Python, Open Policy Agent optional

**Goal.** A policy layer for a document API evaluated with roles and attributes.  
**Approach.** Model roles, resources and owners → Write RBAC then ABAC rules → Build a decision test table → Log decisions for audit  
**Done when.** Test table of 40 cases passes and each decision is logged.  
**Measure.** Cases covered  
**Pitfalls.** Authorizing only at the route layer  

### Dynamic database credentials with Vault
`svc-vault-dynamic-secrets` · Y2 · level 4 · 5 h · HashiCorp Vault dev server, PostgreSQL

**Goal.** An app that fetches short-lived database credentials and survives rotation.  
**Approach.** Configure the database secrets engine → Fetch credentials with a lease → Renew and re-fetch before expiry → Revoke and watch the app recover  
**Done when.** Credentials rotate every 5 minutes without request failures.  
**Measure.** Failed requests during rotation (0)  
**Pitfalls.** Connection pools holding revoked credentials  

### Double-entry ledger
`svc-double-entry-ledger` · Y2 · level 4 · 6 h · PostgreSQL, Python

**Goal.** An append-only ledger with balanced transactions and derived balances.  
**Approach.** Model accounts, entries and transactions → Enforce debits equal credits with constraints → Compute balances and a trial balance → Reconcile against a naive balance column  
**Done when.** Property test of random transfers keeps the trial balance at zero.  
**Measure.** Transactions per second  
**Pitfalls.** Floating-point money; Updating historical rows  

### Payment intent state machine
`svc-payment-intent-state-machine` · Y2 · level 4 · 5 h · Python, PostgreSQL, pytest

**Goal.** A payment lifecycle with legal transitions, idempotent confirms and webhook reconciliation.  
**Approach.** Define states and allowed transitions → Make confirm and capture idempotent → Simulate a provider with timeouts and duplicate webhooks → Reconcile stuck payments  
**Done when.** No illegal transition possible and duplicate webhooks have no effect.  
**Measure.** Illegal transitions blocked in tests  
**Pitfalls.** Treating a timeout as a failure  

### CQRS read model with projections
`svc-cqrs-read-model-projection` · Y2 · level 4 · 6 h · Python, PostgreSQL, event log

**Goal.** A command side writing events and a projector rebuilding a read model on demand.  
**Approach.** Define commands and events → Persist events with versions → Build a projector with checkpointing → Rebuild from scratch and compare  
**Done when.** Full rebuild produces identical read-model state.  
**Measure.** Rebuild time for 1M events  
**Pitfalls.** Non-deterministic projectors  

### Logical replication and lag monitoring
`svc-postgres-logical-replication` · Y2 · level 4 · 5 h · PostgreSQL, Docker

**Goal.** A publisher and subscriber pair with monitored lag and a controlled failover drill.  
**Approach.** Configure publication and subscription → Generate write load and chart lag → Break the subscriber and observe slot growth → Promote and reconnect clients  
**Done when.** Lag alert fires and WAL growth is understood and bounded.  
**Measure.** Replication lag under load (ms)  
**Pitfalls.** Abandoned slots filling the disk  

### Caching reverse proxy honouring HTTP semantics
`svc-caching-reverse-proxy` · Y2 · level 4 · 7 h · Go, Rust or Python asyncio

**Goal.** A proxy cache implementing Cache-Control, Vary, revalidation and stale-while-revalidate.  
**Approach.** Parse caching directives → Key on URL plus Vary headers → Revalidate with conditional requests → Serve stale during origin errors  
**Done when.** Conformance tests pass for max-age, no-store, Vary and stale cases.  
**Measure.** Hit ratio and origin load reduction  
**Pitfalls.** Ignoring Vary headers  

### Internal CA and mutual TLS between services
`svc-mtls-internal-ca` · Y2 · level 4 · 5 h · openssl or step-ca, Python, Docker

**Goal.** Two services authenticating each other with short-lived certificates.  
**Approach.** Create a root and intermediate CA → Issue service certs with SANs → Enforce client certs → Automate renewal before expiry  
**Done when.** Requests without a valid client cert are rejected and renewal runs unattended.  
**Measure.** Certificate lifetime and renewals  
**Pitfalls.** Private keys baked into images  

### Row-level security for tenant isolation
`svc-postgres-rls-multitenancy` · Y2 · level 4 · 4 h · PostgreSQL RLS, FastAPI

**Goal.** Tenant isolation enforced in the database with a leak-attempt test suite.  
**Approach.** Add tenant_id and policies → Set tenant via session variable per request → Write cross-tenant attack tests → Check index and plan impact  
**Done when.** No cross-tenant read or write succeeds in tests.  
**Measure.** Attack tests blocked  
**Pitfalls.** Superuser roles bypassing RLS; Pooled connections leaking the setting  

### Blue-green and canary on Kubernetes
`svc-canary-blue-green-k8s` · Y2 · level 4 · 5 h · kind, Argo Rollouts or manual, Prometheus

**Goal.** Two release strategies with automated rollback on elevated error rate.  
**Approach.** Deploy v1 and v2 side by side → Shift traffic by weight → Analyse error rate and abort → Compare rollback time  
**Done when.** A faulty v2 is rolled back automatically within 2 minutes.  
**Measure.** Time to rollback (s)  
**Pitfalls.** Judging canary on too little traffic  

### Columnar storage with vectorised scans
`svc-columnar-vectorised-scan` · Y2 · level 4 · 7 h · Rust or C++, SIMD optional

**Goal.** A column file format with dictionary and run-length encoding and fast filtered aggregates.  
**Approach.** Define columnar layout on disk → Add dictionary and RLE encodings → Implement filter-aggregate in batches → Benchmark against row-wise scan  
**Done when.** Aggregate over 100M values is at least 5x faster than row layout.  
**Measure.** Scan GB per second  
**Pitfalls.** Branchy per-row loops  

### Write-ahead log library with crash tests
`svc-write-ahead-log-library` · Y2 · level 4 · 7 h · Rust or Go

**Goal.** A durable append-only log with checksums, segments and recovery tested by fault injection.  
**Approach.** Append records with CRC and length → Roll segments and fsync policy options → Recover by truncating torn tails → Kill the process at random points  
**Done when.** 1000 random crashes lose no acknowledged record.  
**Measure.** Throughput by fsync policy  
**Pitfalls.** Assuming write implies durable  

### Event-sourced bank account with snapshots
`svc-event-sourced-account` · Y2 · level 4 · 5 h · Python, PostgreSQL

**Goal.** An aggregate rebuilt from events with snapshotting and upcasting for a schema change.  
**Approach.** Store events with expected-version checks → Rebuild aggregates → Add snapshots every N events → Upcast an old event shape  
**Done when.** Rebuild with and without snapshot yields identical state and is faster.  
**Measure.** Load time at 100k events  
**Pitfalls.** Mutating past events  

### Chaos experiments with Toxiproxy
`svc-toxiproxy-chaos-experiments` · Y3 · level 4 · 5 h · Toxiproxy, k6, Docker Compose

**Goal.** Three hypothesis-driven fault injections with steady-state metrics and fixes.  
**Approach.** Define steady-state SLIs → Inject latency, resets and partitions → Compare against hypotheses → Fix the weakest dependency handling  
**Done when.** Each experiment has hypothesis, result and fix.  
**Measure.** Steady-state deviation per fault  
**Pitfalls.** Running chaos with no abort condition  

### Distributed lock with fencing tokens
`svc-distributed-lock-fencing` · Y3 · level 4 · 5 h · Python, Redis or PostgreSQL

**Goal.** A lease lock plus fencing tokens preventing stale-holder writes in a pause simulation.  
**Approach.** Implement lease lock → Simulate a process pause past lease expiry → Show corruption without fencing → Add monotonic tokens checked by storage  
**Done when.** Stale holder write is rejected by the storage layer.  
**Measure.** Corrupt writes with and without fencing  
**Pitfalls.** Believing a lease check implies safety  

### Leader election over a lease store
`svc-leader-election-lease` · Y3 · level 4 · 5 h · Python, etcd or PostgreSQL advisory locks

**Goal.** N workers elect one leader that survives crashes and partitions.  
**Approach.** Acquire and renew a lease → Handle clock skew with TTL margins → Kill the leader repeatedly → Record time without a leader  
**Done when.** Never two leaders in 100 forced failovers.  
**Measure.** Max leaderless gap (s)  
**Pitfalls.** Renewing after expiry  

### Two-phase commit with failure injection
`svc-two-phase-commit-sim` · Y3 · level 4 · 6 h · Python, asyncio

**Goal.** A coordinator and participants with logs showing blocking on coordinator failure.  
**Approach.** Implement prepare and commit with durable logs → Inject crashes at each step → Implement recovery → Document the blocking window  
**Done when.** All crash points recover to a consistent outcome.  
**Measure.** Crash points tested  
**Pitfalls.** Participants forgetting prepared state  

### Change data capture to a search index
`svc-cdc-debezium-materialized` · Y3 · level 4 · 6 h · Debezium, Kafka or Redpanda, Postgres, OpenSearch

**Goal.** Row changes streamed into a search index with ordering and replay.  
**Approach.** Enable logical decoding and a connector → Consume change events with keys → Upsert and delete in the index → Rebuild from a snapshot  
**Done when.** Index matches the table after random writes and a rebuild.  
**Measure.** End-to-end lag (ms)  
**Pitfalls.** Out-of-order updates on key change  

### Hash join versus sort-merge join benchmark
`svc-hash-vs-merge-join-bench` · Y3 · level 4 · 6 h · Rust or C++

**Goal.** Both joins implemented with runtime plotted against table size and skew.  
**Approach.** Implement a hash join with partitioning → Implement sort-merge join → Generate uniform and skewed keys → Plot crossovers and explain  
**Done when.** Plots show a size and skew crossover and match an explanation.  
**Measure.** Join time at 10M rows  
**Pitfalls.** Cache-unfriendly build tables  

### Envoy sidecar routing, retries and circuit limits
`svc-envoy-sidecar-config` · Y3 · level 4 · 4 h · Envoy, Docker Compose

**Goal.** Two services behind Envoy with retry budgets, outlier ejection and metrics.  
**Approach.** Write static Envoy config → Add retries with budgets and timeouts → Enable outlier detection → Read admin stats under failure  
**Done when.** A failing instance is ejected and retries stay under budget.  
**Measure.** Retry ratio during failure  
**Pitfalls.** Retries on non-idempotent routes  

### Tail-based trace sampling
`svc-tail-sampling-tracing` · Y3 · level 4 · 5 h · OpenTelemetry Collector, Jaeger

**Goal.** A collector keeping all error and slow traces while sampling the rest.  
**Approach.** Generate mixed traffic with errors → Configure tail sampling policies → Verify error traces kept → Measure storage reduction  
**Done when.** 100 percent of error traces retained while volume drops 90 percent.  
**Measure.** Storage reduction percent  
**Pitfalls.** Traces split across collectors  

### Tail latency and hedged requests simulation
`svc-latency-tail-hedging-sim` · Y3 · level 4 · 4 h · Python, simulation

**Goal.** A simulation showing fan-out tail amplification and hedging benefits.  
**Approach.** Model service latency distribution with heavy tail → Fan out to N backends → Add hedged and tied requests → Plot p99 versus load  
**Done when.** Hedging cuts p99 materially at under 10 percent extra load.  
**Measure.** p99 reduction and extra load percent  
**Pitfalls.** Hedging non-idempotent requests  
