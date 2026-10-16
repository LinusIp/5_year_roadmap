# Daily easy coding challenges (254)

## arrays

### Spin the carousel
`dc-a-rotate-the-carousel` · easy · 20 min

A carousel holds n horses, each tagged with a number. One spin moves every horse one seat to the right, and the horse in the last seat wraps to seat 0. Given the tags and a number of spins k, print the tags after k spins.

**Input.** Line 1: n integers; line 2: the integer k.  
**Output.** n integers separated by spaces.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ k ≤ 10^9  
**Example.** `1 2 3 4 5
2` → `4 5 1 2 3` (The last two tags wrap around to the front.)  
**Example.** `7 8 9
4` → `9 7 8` (k=4 on 3 seats is the same as k=1, so only the last tag wraps.)  
**Hints.** Spinning n times returns to the start, so reduce k modulo n. / The answer is the last k items followed by the first n-k items.  
**Approach.** Reduce k modulo n, then output the slice of the last k elements followed by the first n-k elements. This avoids simulating individual spins. (O(n) time, O(n) extra space)  
**Edge cases.** k is a multiple of n; n = 1; k = 0

### Sweep the zeros to the back
`dc-a-zeros-to-the-back` · easy · 20 min

A cashier has a row of coin counts, and some slots are empty (0). Slide all the non-empty counts to the front while keeping their relative order, and push every 0 to the end of the row.

**Input.** One line of n integers.  
**Output.** The rearranged row as n integers.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^9  
**Example.** `0 3 0 4 5` → `3 4 5 0 0` (3, 4, 5 keep their order; the two zeros go last.)  
**Example.** `0 0 1` → `1 0 0` (The single 1 moves to the front.)  
**Hints.** Keep a write position for the next non-zero value. / After copying all non-zeros forward, fill the rest with zeros.  
**Approach.** Scan once with a write index, copying each non-zero value to the write index and advancing it. Fill the remaining positions with zeros. (O(n) time, O(1) extra space (in place))  
**Edge cases.** no zeros; all zeros; single element

### Find the runner-up score
`dc-a-runner-up-score` · easy · 20 min

A game logs the scores of n rounds. The runner-up is the second largest distinct score. Print it, or -1 if every round has the same score.

**Input.** One line of n integers.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^9  
**Example.** `4 9 9 2` → `4` (9 is the best (twice); the next distinct value is 4.)  
**Example.** `5 5 5` → `-1` (Only one distinct value exists, so there is no runner-up.)  
**Hints.** Duplicates of the maximum do not count as the runner-up. / Track the best and the second best in one pass, updating only on strictly greater/lesser values.  
**Approach.** Keep two variables, best and second, initialised to negative infinity. For each value, if it exceeds best shift best into second; else if it is between second and best (strictly) update second. (O(n) time, O(1) extra space)  
**Edge cases.** all equal; n = 1; negative numbers

### Skyline leaders
`dc-a-skyline-leaders` · easy · 25 min

Buildings stand in a row from west to east. A building is a leader if it is strictly taller than every building to its east (the easternmost building is always a leader). Print the heights of all leaders from west to east.

**Input.** One line of n building heights.  
**Output.** Leader heights from west to east, space separated.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ height ≤ 10^9  
**Example.** `16 17 4 3 5 2` → `17 5 2` (17 beats everything to its right; 5 beats 2; 2 is last.)  
**Example.** `9 4 4` → `9 4` (The middle 4 is not strictly taller than the final 4, so it is not a leader.)  
**Hints.** Think about scanning from the east end instead. / Keep the maximum seen so far while walking west; a new strict maximum is a leader.  
**Approach.** Walk from right to left maintaining the running maximum. Whenever the current height is strictly greater than that maximum, record it and update the maximum, then reverse the recorded list. (O(n) time, O(n) output space)  
**Edge cases.** strictly decreasing row; equal heights; single building

### Tidy the sorted ledger
`dc-a-unique-sorted-ledger` · easy · 20 min

A ledger lists invoice numbers in non-decreasing order, so repeats sit next to each other. Print the ledger with each number appearing only once, still in order.

**Input.** One line of n sorted integers.  
**Output.** The deduplicated list, space separated.  
**Constraints.** 1 ≤ n ≤ 10^5; values fit in 32-bit  
**Example.** `1 1 2 2 2 3` → `1 2 3` (Each run of equal numbers collapses to one.)  
**Example.** `5 5` → `5` (Both 5s collapse into a single 5.)  
**Hints.** Equal numbers are adjacent, so compare with the previous kept number. / Use a write pointer to do it in place.  
**Approach.** Because equal values are adjacent, keep an element only if it differs from the last kept one. A write index allows doing it in place. (O(n) time, O(1) extra space)  
**Edge cases.** all equal; no duplicates; n = 1

### The missing badge
`dc-a-missing-badge` · easy · 20 min

Badges are numbered 0 through n, but only n of them were handed out, each at most once. Given the numbers handed out in arbitrary order, print the one badge number that was not given.

**Input.** One line of n distinct integers, each in 0..n.  
**Output.** The missing integer.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `3 0 1` → `2` (n=3 so badges 0..3 exist; 2 is absent.)  
**Example.** `0 1 2 3` → `4` (n=4 so badges 0..4 exist; 4 is absent.)  
**Hints.** Compare against the sum of 0..n. / n(n+1)/2 minus the actual sum gives the answer (or XOR everything).  
**Approach.** The sum of 0..n is n(n+1)/2. Subtract the sum of the given numbers to get the missing badge. (O(n) time, O(1) extra space)  
**Edge cases.** missing 0; missing n; n = 1

### Landslide winner
`dc-a-landslide-winner` · easy · 25 min

In a vote, each ballot names a candidate by id. It is guaranteed that one candidate received strictly more than half of all ballots. Find that candidate using constant extra memory.

**Input.** One line of n candidate ids.  
**Output.** The winning id.  
**Constraints.** 1 ≤ n ≤ 10^5; ids fit in 32-bit; a majority winner exists  
**Example.** `2 2 1 1 2` → `2` (2 has 3 of 5 votes.)  
**Example.** `4 4 9 4 9 9 9` → `9` (9 has 4 of 7 votes.)  
**Hints.** A true majority cannot be cancelled out by pairing it off with different ids. / Keep a candidate and a counter: same id +1, different id -1, reset when it hits 0.  
**Approach.** Use the Boyer-Moore voting idea: maintain a candidate and a count; matching ids increment, others decrement, and when the count is 0 pick the current id. The guaranteed majority survives. (O(n) time, O(1) extra space)  
**Edge cases.** n = 1; winner appears only at the end; two ids alternating plus one extra

### Best streak of profit
`dc-a-best-streak-profit` · easy · 25 min

A shop records its daily profit (possibly negative) for n days. Choose a streak of one or more consecutive days that has the largest total profit and print that total.

**Input.** One line of n integers.  
**Output.** One integer: the maximum total of a non-empty consecutive streak.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `3 -4 2 -1 5 -6 1` → `6` (Days 3 to 5 give 2-1+5=6.)  
**Example.** `-3 -1 -2` → `-1` (All days lose money, so the best streak is the single day with -1.)  
**Hints.** At each day decide: extend the previous streak or start fresh here. / best ending here = max(x, best ending previous + x).  
**Approach.** Kadane: keep the best sum of a streak ending at the current day as max(x, previous+x), and track the global maximum. Do not initialise the global maximum to 0 so negative-only input works. (O(n) time, O(1) extra space)  
**Edge cases.** all negative; single element; zeros mixed in

### Zip two sorted queues
`dc-a-zip-two-queues` · easy · 20 min

Two queues of customers each list their ticket numbers in ascending order. Merge them into a single ascending list without re-sorting from scratch. Equal numbers from both queues are all kept.

**Input.** Line 1: first sorted list; line 2: second sorted list.  
**Output.** The merged list, space separated.  
**Constraints.** 1 ≤ each length ≤ 10^5; values fit in 32-bit  
**Example.** `1 3 5
2 4 6` → `1 2 3 4 5 6` (Alternating picks give 1..6.)  
**Example.** `1 1 2
1 3` → `1 1 1 2 3` (Three 1s survive, then 2, then 3.)  
**Hints.** Keep one pointer in each list and always take the smaller head. / When one list runs out, append the rest of the other.  
**Approach.** Use two pointers, repeatedly appending the smaller current element and advancing that pointer. Append whatever remains when one list is exhausted. (O(n+m) time, O(n+m) output space)  
**Edge cases.** all of one list smaller; equal values across lists; single-element lists

## backtracking

### Every possible team
`dc-c-all-subsets` · easy · 25 min

Given n distinct integers, list every subset (including the empty one). Sort the numbers first; print each subset in increasing order, and list subsets in lexicographic order, so a shorter prefix comes before its extensions (for 1 2: empty, 1, 1 2, 2). Print the empty subset as a single dash.

**Input.** First line n; second line n distinct integers.  
**Output.** One subset per line, numbers separated by spaces; '-' for the empty subset.  
**Constraints.** 1 ≤ n ≤ 12  
**Example.** `2
2 1` → `-
1
1 2
2` (Sorted to 1 2: empty, {1}, {1,2}, {2}.)  
**Example.** `3
3 1 2` → `-
1
1 2
1 2 3
1 3
2
2 3
3` (Eight subsets in lexicographic order.)  
**Hints.** Decide include/exclude, or pick the next element from a start index. / Record the current path at every node of the recursion, not just at the leaves.  
**Approach.** DFS with a start index: record the current subset, then for each later element append it, recurse and pop. Sorting up front gives lexicographic order. (O(n · 2^n) time, O(n) stack)  
**Edge cases.** Single element; Unsorted input; Negative numbers

### Every lineup order
`dc-c-all-orderings` · easy · 25 min

n runners numbered 1 to n line up in every possible order. Print all orderings (permutations) in lexicographic order, one per line.

**Input.** One integer n.  
**Output.** n! lines, each with the n numbers separated by spaces.  
**Constraints.** 1 ≤ n ≤ 7  
**Example.** `2` → `1 2
2 1` (Two orders.)  
**Example.** `3` → `1 2 3
1 3 2
2 1 3
2 3 1
3 1 2
3 2 1` (Six orders, 1 2 3 first and 3 2 1 last.)  
**Hints.** Keep a boolean array of numbers already used. / Trying numbers in increasing order at each position gives lexicographic output.  
**Approach.** Recursive fill of positions 1..n: for each unused number, place it, recurse, then undo. Output when the arrangement is complete. (O(n · n!) time, O(n) space)  
**Edge cases.** n = 1; Order of output; Largest n

### Choose a team of k
`dc-c-choose-team` · easy · 25 min

From players numbered 1 to n, list every team of exactly k players. Each team is written in increasing order and teams are listed in lexicographic order.

**Input.** One line with n and k.  
**Output.** One team per line, numbers separated by spaces.  
**Constraints.** 1 ≤ k ≤ n ≤ 12  
**Example.** `4 2` → `1 2
1 3
1 4
2 3
2 4
3 4` (Six pairs from four players.)  
**Example.** `3 3` → `1 2 3` (Only the whole group.)  
**Hints.** After choosing x, the next member must be larger than x. / Stop early when the team has k members.  
**Approach.** DFS choosing the next member from a start index; when the team size reaches k record it. Optionally prune when too few players remain. (O(k · C(n,k)) time, O(k) space)  
**Edge cases.** k = n; k = 1; Pruning when not enough players remain

### Pick items to hit the weight
`dc-c-exact-weight` · easy · 25 min

You have n items with positive weights. Decide whether some subset of the items weighs exactly T in total. A target of 0 is always possible by taking nothing.

**Input.** First line n T; second line n positive integers.  
**Output.** YES if a subset sums to T, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 20; weights and T ≤ 1000  
**Example.** `4 9
3 34 4 12` → `NO` (No subset of 3, 34, 4, 12 sums to 9.)  
**Example.** `5 9
3 34 4 12 5` → `YES` (4+5 = 9.)  
**Hints.** For each item either take it or skip it. / Stop when the remainder reaches 0 or goes negative.  
**Approach.** Recursive take/skip search with the remaining target. Returns true as soon as the remainder is exactly 0; prune when it goes negative. (O(2^n) time, O(n) stack)  
**Edge cases.** T = 0; Single item equal to T; All items larger than T

### All balanced bracket patterns
`dc-c-bracket-patterns` · easy · 30 min

Print every well-formed string made of n pairs of parentheses, in the order where '(' comes before ')'. A string is well-formed if every prefix has at least as many '(' as ')' and the totals match.

**Input.** One integer n.  
**Output.** One string per line, in lexicographic order with '(' < ')'.  
**Constraints.** 1 ≤ n ≤ 8  
**Example.** `2` → `(())
()()` (Two patterns.)  
**Example.** `3` → `((()))
(()())
(())()
()(())
()()()` (Five patterns.)  
**Hints.** Only add ')' when there is an unmatched '('. / Only add '(' while fewer than n have been used.  
**Approach.** Backtrack building the string with counts of opens and closes; branch '(' if opens < n and ')' if closes < opens. This generates only valid strings. (O(4^n / √n) time, O(n) stack)  
**Edge cases.** n = 1; Order of output; n = 8 count (1430)

### Old phone keypad words
`dc-c-keypad-words` · easy · 25 min

On an old phone keypad, 2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv and 9=wxyz. For a string of digits 2-9, list every letter string that could have been typed, in alphabetical order, on a single line separated by spaces.

**Input.** One string of digits from 2 to 9.  
**Output.** All combinations separated by spaces, in alphabetical order.  
**Constraints.** 1 ≤ length ≤ 5  
**Example.** `23` → `ad ae af bd be bf cd ce cf` (3 × 3 = 9 combinations.)  
**Example.** `7` → `p q r s` (Four letters.)  
**Hints.** Each digit gives a small set of choices. / Recurse on the next digit for each letter.  
**Approach.** DFS over digit positions, appending each letter of the current digit to the prefix. Emit at full length. Iterating letters in order yields alphabetical output. (O(4^n · n) time, O(n) stack)  
**Edge cases.** Single digit; Digits 7 and 9 (four letters); Maximum length

### Ways to pay with repeats
`dc-c-coin-recipes` · easy · 30 min

You have n distinct coin values, each available in unlimited quantity. List every multiset of coins that adds up exactly to T. Write each combination in non-decreasing order of values, and list the combinations in lexicographic order. If there are none, print NONE.

**Input.** First line n T; second line n distinct positive integers.  
**Output.** One combination per line, or NONE.  
**Constraints.** 1 ≤ n ≤ 8; 1 ≤ T ≤ 30; values ≥ 1  
**Example.** `3 7
2 3 6` → `2 2 3` (2+2+3 is the only way; using 6 would leave 1, which no coin makes.)  
**Example.** `1 5
3` → `NONE` (3 cannot make 5.)  
**Hints.** Allow choosing the same coin again by recursing with the same index. / Keep coins sorted so you can stop when a coin exceeds the remainder.  
**Approach.** DFS with a start index (not incremented after choosing a coin) and remaining amount; record when it hits 0 and prune when a coin exceeds the remainder. (Exponential in worst case, O(T) stack)  
**Edge cases.** No solution; Single coin repeated; T smaller than every coin

### Bit strings with no 11
`dc-c-no-double-ones` · easy · 25 min

List every binary string of length n that does not contain two adjacent 1s, in increasing order, one per line.

**Input.** One integer n.  
**Output.** One string per line.  
**Constraints.** 1 ≤ n ≤ 10  
**Example.** `2` → `00
01
10` (00, 01, 10 (11 is forbidden).)  
**Example.** `3` → `000
001
010
100
101` (Five valid strings.)  
**Hints.** You may only place a 1 if the previous character is not 1. / Try 0 first so the output is sorted.  
**Approach.** Backtrack position by position, always allowing 0 and allowing 1 only if the previous character is not 1. (O(n · F(n)) time, O(n) stack)  
**Edge cases.** n = 1; Output count equals Fibonacci; Order

### All upper/lower variants
`dc-c-case-variants` · easy · 25 min

Given a string of letters and digits, list every string obtained by choosing upper or lower case for each letter independently. Digits stay as they are. For each letter, the lower-case choice is explored before the upper-case one.

**Input.** One string of letters and digits.  
**Output.** One variant per line, in the explored order.  
**Constraints.** 1 ≤ length ≤ 12  
**Example.** `a1` → `a1
A1` (a1 then A1.)  
**Example.** `ab` → `ab
aB
Ab
AB` (ab, aB, Ab, AB.)  
**Hints.** Only letters branch; digits are copied. / Process characters left to right.  
**Approach.** Recurse over positions, branching into lower and upper case for letters and copying other characters. Emit at the end of the string. (O(2^L · n) time, O(n) stack)  
**Edge cases.** No letters; All letters; Mixed-case input

### Count the self-avoiding walks
`dc-c-all-walks` · easy · 35 min

A small grid has . for open cells and # for walls. Count the different routes from the top-left cell to the bottom-right cell that move up, down, left or right through open cells and never visit the same cell twice.

**Input.** First line R C, then R lines of C characters.  
**Output.** One integer: the number of routes.  
**Constraints.** 1 ≤ R, C ≤ 5  
**Example.** `2 2
..
..` → `2` (Right-down and down-right.)  
**Example.** `3 3
.#.
...
.#.` → `1` (Only the middle row links left and right: one route.)  
**Hints.** Mark a cell visited when you enter it and unmark when you leave. / Reaching the destination counts one route; stop exploring from there.  
**Approach.** DFS with a visited set: from each cell try the four neighbors that are open and unvisited; count each arrival at the target; unmark on return. (Exponential, fine for 5×5; O(R·C) stack)  
**Edge cases.** Start or end blocked; 1x1 grid (one route); Fully open 5x5

## binary-search

### Where does it go
`dc-a-where-it-goes` · easy · 20 min

A sorted list of distinct bib numbers is given. For a new number, print the index where it is, or the index where it would be inserted to keep the list sorted.

**Input.** Line 1: sorted distinct integers; line 2: the query.  
**Output.** One integer index.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `2 4 6 8
5` → `2` (5 would sit between 4 and 6, at index 2.)  
**Example.** `2 4 6 8
9` → `4` (Larger than all, so goes at the end (index 4).)  
**Hints.** Search for the first position whose value is ≥ the query. / Keep lo and hi, and move hi to mid when a[mid] ≥ query.  
**Approach.** Binary search for the lower bound: lo=0, hi=n; while lo<hi take mid, if a[mid] < q set lo=mid+1 else hi=mid. Return lo. (O(log n) time, O(1) space)  
**Edge cases.** smaller than all; larger than all; present at index 0

### First and last sighting
`dc-a-first-and-last-sighting` · easy · 30 min

A sorted list may repeat values. For a given target, print the index of its first and last occurrence, or "-1 -1" if it is absent.

**Input.** Line 1: sorted integers; line 2: target.  
**Output.** Two integers.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 2 2 2 3 5
2` → `1 3` (The 2s occupy indices 1 to 3.)  
**Example.** `1 4
3` → `-1 -1` (3 is not present.)  
**Hints.** Run one binary search for the left edge and one for the right edge. / Right edge = (first index greater than target) - 1.  
**Approach.** Use lower bound for the first index with value ≥ t and upper bound for the first index with value > t. If they are equal the target is absent; otherwise answer (lower, upper-1). (O(log n) time, O(1) space)  
**Edge cases.** target absent; all elements equal target; single element

### Whole square root
`dc-a-whole-square-root` · easy · 20 min

Print the largest integer r such that r*r ≤ n, without using floating-point square root.

**Input.** One integer n.  
**Output.** One integer.  
**Constraints.** 0 ≤ n ≤ 10^12  
**Example.** `17` → `4` (4*4=16 ≤ 17 but 5*5=25 > 17.)  
**Example.** `25` → `5` (5*5 = 25 exactly.)  
**Hints.** The predicate r*r ≤ n is true for small r and false for large r. / Binary search for the last r where it is true.  
**Approach.** Binary search r in [0, n], testing mid*mid ≤ n, keeping the largest passing value. Use an upper-mid to avoid an infinite loop. (O(log n) time, O(1) space)  
**Edge cases.** n = 0; n = 1; perfect square

### Coldest point on the dial
`dc-a-coldest-point-of-dial` · easy · 30 min

A sorted list of distinct numbers was rotated at an unknown point. Print the smallest number in it in logarithmic time.

**Input.** One line of the rotated list.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; values distinct  
**Example.** `4 5 6 1 2 3` → `1` (The drop from 6 to 1 marks the start.)  
**Example.** `1 2 3` → `1` (Not rotated, so the first is the minimum.)  
**Hints.** Compare a[mid] with a[hi]. / If a[mid] > a[hi] the minimum is to the right of mid; otherwise it is at mid or left.  
**Approach.** Binary search with lo, hi: if a[mid] > a[hi] set lo=mid+1, else set hi=mid. When lo equals hi that element is the minimum. (O(log n) time, O(1) space)  
**Edge cases.** n = 1; not rotated; rotated by n-1

### Next letter up
`dc-a-next-letter-up` · easy · 20 min

Letters in a sorted list are used as labels. Given a target letter, print the smallest label that is strictly greater than it; if none is, wrap around and print the first label.

**Input.** Line 1: sorted lowercase letters separated by spaces; line 2: target letter.  
**Output.** One letter.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `c f j
c` → `f` (f is the first letter after c.)  
**Example.** `c f j
z` → `c` (Nothing is greater than z, so wrap to c.)  
**Hints.** This is an upper-bound search. / If the index reaches n, use index 0.  
**Approach.** Find the first index with letter > target using binary search (upper bound) and return that letter, using index modulo n to handle the wrap. (O(log n) time, O(1) space)  
**Edge cases.** target below all; target above all; target equals a label

### Cube for the crate
`dc-a-cube-for-the-crate` · easy · 20 min

A cubic box with integer side x holds x*x*x units. Given a volume n, find the smallest integer side x whose box holds at least n units.

**Input.** One integer n.  
**Output.** One integer.  
**Constraints.** 0 ≤ n ≤ 10^15  
**Example.** `30` → `4` (3^3 = 27 < 30 but 4^3 = 64 ≥ 30.)  
**Example.** `27` → `3` (3^3 = 27 exactly.)  
**Hints.** The predicate x^3 ≥ n is false then true as x grows. / Search for the first x where it becomes true.  
**Approach.** Binary search x in [0, n] for the first value with x^3 ≥ n: if mid^3 ≥ n shrink the right bound to mid, else move the left bound past mid. (O(log n) time, O(1) space)  
**Edge cases.** n = 0; n = 1; perfect cube

## bits

### Find the lonely badge
`dc-d-lonely-badge` · easy · 20 min

Every visitor badge at a conference is scanned once on entry and once on exit, so each badge id appears exactly twice in the log, except one visitor who never left. Find the id of the badge that appears only once.

**Input.** First line n (odd), second line n badge ids.  
**Output.** The single badge id that appears once.  
**Constraints.** 1 ≤ n ≤ 10^5, n odd; ids are non-negative and fit in 32 bits  
**Example.** `5
7 3 7 9 3` → `9` (9 is the only id without a partner)  
**Example.** `1
42` → `42` (a lone entry is the answer)  
**Hints.** What is x XOR x? What is x XOR 0? / XOR is commutative and associative, so pairs cancel regardless of order.  
**Approach.** XOR all values together; paired values cancel to zero and the unpaired one remains. (O(n) time, O(1) extra space)  
**Edge cases.** n = 1; Id 0 is the lonely one; Large ids near 2^32

### Count the lit switches
`dc-d-count-set-bits` · easy · 20 min

A control panel stores the state of 32 switches in a single non-negative integer, where bit i is 1 if switch i is on. Report how many switches are on. Try to do it without converting to a string.

**Input.** A single integer n.  
**Output.** The number of 1 bits in n.  
**Constraints.** 0 ≤ n < 2^32  
**Example.** `13` → `3` (13 is 1101 in binary)  
**Example.** `0` → `0` (no switches on)  
**Hints.** Subtracting 1 from a number flips its lowest set bit and everything below it. / n & (n-1) clears the lowest set bit; count how many times you can do that.  
**Approach.** Repeatedly apply n &= n-1 and count iterations until n is zero (Kernighan's trick). (O(k) time where k is the number of set bits, O(1) space)  
**Edge cases.** n = 0; n = 2^32 - 1 gives 32; A single high bit

### Crate stacking sizes
`dc-d-power-of-two-crate` · easy · 20 min

A warehouse only accepts crates whose side length is a power of two (1, 2, 4, 8, ...). Given a side length, say whether it is acceptable. Use a bit trick rather than a loop of divisions.

**Input.** A single integer n.  
**Output.** YES if n is a power of two, otherwise NO.  
**Constraints.** -10^9 ≤ n ≤ 10^9  
**Example.** `64` → `YES` (2^6)  
**Example.** `12` → `NO` (1100 has two set bits)  
**Hints.** A power of two has exactly one set bit. / Negative numbers and zero are never powers of two; check them first.  
**Approach.** Return n > 0 and (n & (n-1)) == 0, since clearing the only set bit leaves zero. (O(1) time and space)  
**Edge cases.** n = 0; n = 1; Negative numbers

### How many switches differ
`dc-d-flip-distance` · easy · 20 min

Two control panels each store their switch states as an integer. Count the switches whose state differs between the two panels, i.e. the number of bit positions where the two numbers disagree.

**Input.** Two integers a and b on one line.  
**Output.** The number of differing bit positions.  
**Constraints.** 0 ≤ a, b < 2^31  
**Example.** `10 5` → `4` (1010 vs 0101 differ in all 4 bits -> 4)  
**Example.** `7 7` → `0` (identical panels)  
**Hints.** Which operation gives 1 exactly where two bits differ? / Count the ones in the result.  
**Approach.** Compute a XOR b and count its set bits. (O(log max(a,b)) time, O(1) space)  
**Edge cases.** a = b; One of them is 0; Both near 2^31

### Mirror the 32-bit word
`dc-d-mirror-32` · easy · 25 min

A legacy device sends 32-bit words with the bit order flipped: bit 0 should become bit 31, bit 1 should become bit 30, and so on. Given an unsigned 32-bit value, output the value with its bits mirrored.

**Input.** One unsigned integer n.  
**Output.** The mirrored unsigned integer.  
**Constraints.** 0 ≤ n < 2^32  
**Example.** `1` → `2147483648` (bit 0 moves to bit 31 -> 2^31)  
**Example.** `43261596` → `964176192` (this pattern mirrors to 964176192)  
**Hints.** Build the result one bit at a time: shift the result left, then add the lowest bit of n. / Do this exactly 32 times, even if n runs out of ones early.  
**Approach.** Loop 32 times: result = (result << 1) | (n & 1); n >>= 1. Mask to 32 bits if the language has wider integers. (O(32) time, O(1) space)  
**Edge cases.** n = 0; n = 2^32 - 1; n = 1 and n = 2^31

### Single-switch walk
`dc-d-gray-walk` · easy · 25 min

A panel with n switches must visit all 2^n switch configurations, changing exactly one switch between consecutive configurations, starting from all-off. Output the configurations as integers using the standard reflected Gray code order, where element i is i XOR (i >> 1).

**Input.** A single integer n.  
**Output.** 2^n integers separated by spaces.  
**Constraints.** 0 ≤ n ≤ 12  
**Example.** `2` → `0 1 3 2` (0 1 3 2)  
**Example.** `3` → `0 1 3 2 6 7 5 4` (reflected code of length 8)  
**Hints.** Look at the formula in the statement; no search is needed. / Check: consecutive outputs differ in exactly one bit.  
**Approach.** Emit i ^ (i >> 1) for i from 0 to 2^n - 1. (O(2^n) time and output size)  
**Edge cases.** n = 0 outputs just 0; n = 1; Largest n

### Backpack subsets
`dc-d-backpack-subsets` · easy · 30 min

You have n items with given weights and a backpack that can carry at most K units. Count how many subsets of items (including the empty one) have a total weight not exceeding K. Enumerate subsets with a bitmask.

**Input.** First line n and K, second line n weights.  
**Output.** The number of subsets with total weight at most K.  
**Constraints.** 1 ≤ n ≤ 16; 1 ≤ weight ≤ 100; 0 ≤ K ≤ 1600  
**Example.** `3 5
2 3 4` → `5` (subsets: {}, {2}, {3}, {4}, {2,3} -> 5)  
**Example.** `2 0
1 1` → `1` (only the empty set fits)  
**Hints.** Each integer from 0 to 2^n - 1 describes one subset: bit i says whether item i is taken. / Sum weights for the set bits and compare to K.  
**Approach.** Loop over all masks, sum the weights of set bits, and count those within the limit. (O(2^n * n) time, O(1) space)  
**Edge cases.** K = 0 leaves only the empty subset; K large counts all 2^n; n = 1

### Lowest lit switch
`dc-d-lowest-lit-switch` · easy · 20 min

Given a positive integer describing which switches are on, find the lowest switch that is on. Print its value as a power of two, and its index counting from 0 at the least significant bit.

**Input.** A single positive integer n.  
**Output.** Two integers: the isolated lowest set bit value and its index.  
**Constraints.** 1 ≤ n < 2^31  
**Example.** `40` → `8 3` (40 = 101000, lowest set bit is 8 at index 3 -> '8 3')  
**Example.** `1` → `1 0` (bit 0 -> '1 0')  
**Hints.** In two's complement, -n flips all bits above the lowest set bit. / n & -n keeps only that lowest bit.  
**Approach.** Compute low = n & -n; the index is the number of trailing zeros, i.e. log2(low). (O(1) time and space)  
**Edge cases.** n = 1; n is a power of two; n odd

### Swap neighbouring bits
`dc-d-swap-neighbour-bits` · easy · 25 min

A 32-bit word must be fixed by swapping every even-position bit with its odd neighbour: bit 0 with bit 1, bit 2 with bit 3, and so on up to bits 30 and 31. Output the repaired value.

**Input.** One unsigned integer n.  
**Output.** The word after swapping.  
**Constraints.** 0 ≤ n < 2^32  
**Example.** `5` → `10` (0101 becomes 1010 = 10)  
**Example.** `4294967295` → `4294967295` (all ones stay all ones)  
**Hints.** Build two masks: one that selects even-position bits, one that selects odd-position bits. / Shift the even bits left, the odd bits right, and OR them.  
**Approach.** result = ((n & 0x55555555) << 1) | ((n & 0xAAAAAAAA) >> 1). (O(1) time and space)  
**Edge cases.** n = 0; All ones; Only bit 31 set

### Longest streak of ones
`dc-d-longest-streak-on` · easy · 20 min

A status register records an on/off flag per minute as the bits of an integer. Find the length of the longest run of consecutive 1 bits in its binary form.

**Input.** One non-negative integer n.  
**Output.** The length of the longest run of 1s.  
**Constraints.** 0 ≤ n < 2^62  
**Example.** `222` → `4` (11011110 has a run of four 1s)  
**Example.** `0` → `0` (no ones)  
**Hints.** Walk through bits while tracking the current run and the best run so far. / A trick: n &= n << 1 shortens every run by one; count how many steps until n is 0.  
**Approach.** Repeat n &= (n << 1) and count steps until n becomes 0; the count is the longest run. (O(run length) time, O(1) space)  
**Edge cases.** n = 0; n = 2^k - 1; Runs separated by single zeros

## bst

### How deep is it
`dc-b-find-depth` · easy · 25 min

Build a binary search tree by inserting values in the order given. Then report the depth of a query value (the root has depth 0), or -1 if the value is not in the tree.

**Input.** Line 1: insertion order. Line 2: the query value.  
**Output.** The depth of the value, or -1.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `50 30 70 20 40 60 80
60` → `2` (50 -> 70 -> 60, so depth 2.)  
**Example.** `8 3 10 1 6
7` → `-1` (7 is not stored in the tree.)  
**Hints.** Use the BST ordering to decide where to go next. / Starting at the root, go left if the query is smaller, right if larger, counting steps until you find it or fall off.  
**Approach.** Insert values with the standard BST rule, then search from the root while counting steps; return -1 if you reach a missing child. (O(h) per insert and search)  
**Edge cases.** Query is the root; Query not present; Skewed insertion order

### k-th smallest key
`dc-b-kth-smallest-key` · easy · 25 min

Insert the given values into a binary search tree and report the k-th smallest value stored (k = 1 is the minimum). Use the BST's structure rather than sorting the raw input.

**Input.** Line 1: insertion order. Line 2: k.  
**Output.** The k-th smallest value.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^4  
**Example.** `5 3 8 1 4
2` → `3` (In-order is 1 3 4 5 8, so the 2nd is 3.)  
**Example.** `10
1` → `10` (Only one value.)  
**Hints.** What traversal of a BST produces sorted order? / Do an in-order traversal and stop after visiting k nodes.  
**Approach.** Perform an iterative in-order traversal with a stack, counting visited nodes, and return the value when the counter reaches k. (O(h + k) time, O(h) space)  
**Edge cases.** k = 1; k = n; Skewed tree

### Range total
`dc-b-range-total` · easy · 25 min

A BST stores sales figures. Given a low and a high bound, compute the sum of all stored values that lie in the closed range [low, high]. Skip subtrees that cannot contain qualifying values.

**Input.** Line 1: insertion order. Line 2: low and high.  
**Output.** The sum of values within the range.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `10 5 15 3 7 18
7 15` → `32` (The values 7, 10 and 15 are in range: 32.)  
**Example.** `10 5 15
20 30` → `0` (No stored value is in [20, 30]: 0.)  
**Hints.** If a node is below the low bound, its left subtree is useless. / DFS: if value < low go right only; if value > high go left only; otherwise add it and visit both.  
**Approach.** Recursive DFS using the BST property to prune: skip the left subtree when the node is below low and the right subtree when it is above high; add values in range. (O(h + k) time where k is the number of visited nodes in range)  
**Edge cases.** Range includes everything; Range includes nothing; Bounds equal to stored values

### Search-tree ancestor
`dc-b-search-tree-ancestor` · easy · 25 min

Insert the values into a BST. For two values that are stored in the tree, find their lowest common ancestor: the deepest node having both in its subtree (a node counts as its own descendant).

**Input.** Line 1: insertion order. Line 2: two stored values.  
**Output.** The value of the lowest common ancestor.  
**Constraints.** 2 ≤ n ≤ 10^4  
**Example.** `20 10 30 5 15 25 35
5 15` → `10` (5 is left of 10 and 15 is right of 10, so they split at 10.)  
**Example.** `20 10 30 5 15 25 35
5 25` → `20` (They are on opposite sides of the root 20.)  
**Hints.** Compare both values with the current node. / If both are smaller go left, if both are larger go right, otherwise the current node is the answer.  
**Approach.** Walk down from the root. While both values lie on the same side of the current node, move to that child. The first node where they split (or equal one of them) is the answer. (O(h) time, O(1) space)  
**Edge cases.** One value is the ancestor; Values are siblings; Skewed tree

### Floor and ceiling
`dc-b-floor-and-ceiling` · easy · 25 min

For a query number x, the floor in a BST is the largest stored value that is at most x and the ceiling is the smallest stored value that is at least x. Insert the values, then print the floor and the ceiling of x, using the word none where no such value exists.

**Input.** Line 1: insertion order. Line 2: the query x.  
**Output.** Floor and ceiling separated by a space.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `20 10 30 5 15 25 35
27` → `25 30` (The largest value ≤ 27 is 25 and the smallest ≥ 27 is 30.)  
**Example.** `20 10 30 5 15 25 35
1` → `none 5` (Nothing is ≤ 1, and the smallest value ≥ 1 is 5: none 5.)  
**Hints.** Each comparison narrows your candidate. / Walk from the root: if node ≤ x, it is a floor candidate and go right; otherwise go left. Do the mirror for ceiling.  
**Approach.** Descend from the root once for each of floor and ceiling. For the floor, record the node when value ≤ x and move right, else move left. For the ceiling record when value ≥ x and move left, else right. (O(h) time, O(1) space)  
**Edge cases.** x equals a stored value; x below the minimum; x above the maximum

### Insertion height
`dc-b-insertion-height` · easy · 25 min

Build a BST by inserting the given distinct values in order and report the tree's height, counting the number of nodes on the longest root-to-leaf path. The order of insertion changes the shape, so it matters.

**Input.** One line of distinct integers inserted in order.  
**Output.** The height as a number of nodes.  
**Constraints.** 1 ≤ n ≤ 5000  
**Example.** `5 3 8 1 4 2` → `4` (5-3-1-2 is the longest path with 4 nodes.)  
**Example.** `4 2 6 1 3 5 7` → `3` (A perfectly balanced tree of 7 nodes has height 3.)  
**Hints.** Build the tree first, then measure. / height(node) = 1 + max(height(left), height(right)).  
**Approach.** Insert each value with the standard BST rule, then compute the height recursively (or track depth during insertion and keep the maximum). (O(n*h) time to build, O(h) space)  
**Edge cases.** Increasing input (a chain); Single value; Perfectly balanced

### Next in order
`dc-b-next-in-order` · easy · 25 min

After inserting values into a BST, find the in-order successor of a stored value: the smallest stored value that is strictly greater than it. Print none if it is the largest.

**Input.** Line 1: insertion order. Line 2: a stored value.  
**Output.** The successor's value, or none.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `10 5 15 3 7 12 20
7` → `10` (7 has no right subtree, so the successor is the ancestor 10.)  
**Example.** `20 10 30 5 15 25 35
35` → `none` (35 is the maximum, so none.)  
**Hints.** Two cases: the node has a right child, or it does not. / With a right child take its leftmost node; otherwise the answer is the last ancestor where you turned left.  
**Approach.** Walk down from the root toward the value. Whenever you go left from a node, remember that node as a candidate successor. If the target has a right subtree, the successor is the leftmost node in it. (O(h) time, O(1) space)  
**Edge cases.** Value is the maximum; Value has a right subtree; Value is the root

## design

### Stack with a minimum
`dc-b-stack-with-minimum` · easy · 25 min

Design a stack that supports push x, pop, top and min in constant time, where min reports the smallest value currently stored. Simulate the commands; print one number for each top and min command.

**Input.** One line of commands separated by semicolons. pop, top and min are only issued on a non-empty stack.  
**Output.** The results of top and min commands in order.  
**Constraints.** 1 ≤ commands ≤ 10^5  
**Example.** `push 5;push 3;min;push 7;min;pop;pop;min;top` → `3 3 5 5` (Min is 3, still 3 with 7 on top, then after popping 7 and 3 the stack is just 5: 3 3 5 5.)  
**Example.** `push -2;push 0;push -3;min;pop;top;min` → `-3 0 -2` (Min -3; after popping -3 the top is 0 and the min is -2: -3 0 -2.)  
**Hints.** What must you remember about the minimum when something is popped? / Store alongside each element the minimum of the stack up to that element (or use a second stack).  
**Approach.** Keep a second stack (or pair values) where each entry holds the minimum of all elements at or below it. push updates it with min(x, previous min); pop removes from both; min reads the top. (O(1) per operation, O(n) space)  
**Edge cases.** Min changes after pop; Duplicate minimum values; Negative numbers

### Five-second hit counter
`dc-b-five-second-counter` · easy · 25 min

Design a counter that records hits with integer second timestamps and answers how many hits occurred in the last 5 seconds, i.e. with timestamps in [t-4, t], when asked at time t. Timestamps in the commands never decrease. Simulate hit t and count t commands, and print the answer of each count.

**Input.** One line of commands separated by semicolons.  
**Output.** The results of count commands, space-separated.  
**Constraints.** 1 ≤ commands ≤ 10^5; timestamps up to 10^9  
**Example.** `hit 1;hit 2;hit 3;count 4;hit 8;count 8;count 9` → `3 1 1` (At 4 the window [0,4] holds 3 hits; at 8 the window [4,8] holds only the hit at 8; at 9 the window [5,9] holds it too: 3 1 1.)  
**Example.** `hit 1;hit 1;hit 1;count 5;count 6` → `3 0` (Window [1,5] holds three hits; window [2,6] holds none: 3 0.)  
**Hints.** Old hits never matter again. / Keep a queue of timestamps; before counting, pop timestamps older than t-4.  
**Approach.** Store hit timestamps in a deque. On count t, drop timestamps below t-4 from the front and return the deque length. Each timestamp is added and removed once. (Amortised O(1) per operation, O(hits in window) space)  
**Edge cases.** Several hits in the same second; Count with no hits; Big gap between operations

### Browser trail
`dc-b-browser-trail` · easy · 25 min

Design a browser history that starts on a homepage. visit u opens a page and discards all forward history, back k moves back up to k pages (stopping at the oldest), and forward k moves forward up to k pages (stopping at the newest). After each back or forward command print the current page.

**Input.** Line 1: the homepage name. Line 2: commands separated by semicolons.  
**Output.** The current page after each back/forward command, space-separated.  
**Constraints.** 1 ≤ commands ≤ 5000  
**Example.** `home
visit a;visit b;back 1;back 5;forward 1;visit c;forward 2` → `a home a c` (Back from b gives a, back 5 stops at home, forward 1 gives a, visiting c clears forward history, so forward 2 stays on c: a home a c.)  
**Example.** `start
back 2;visit x;forward 1;back 1` → `start x start` (Back at the oldest page stays on start; after visit x forward does nothing; back returns to start: start x start.)  
**Hints.** Treat history as an array with a cursor. / On visit truncate everything after the cursor, append, and move the cursor; clamp back/forward to valid bounds.  
**Approach.** Keep a list of pages and a current index. visit slices the list at index+1 and appends; back and forward adjust the index within [0, len-1] and report the page. (O(1) per back/forward, O(n) per visit with slicing; O(n) space)  
**Edge cases.** Back beyond the start; Forward after visiting; Back then forward

### Ring buffer queue
`dc-b-ring-buffer` · easy · 25 min

Design a queue with a fixed capacity, implemented on a circular array. enq x returns true and appends if there is room, otherwise false; deq removes and returns the front value or -1 if empty; front returns the front value or -1; isfull returns true or false. Print the result of every command.

**Input.** Line 1: capacity. Line 2: commands separated by semicolons.  
**Output.** One result per command, space-separated.  
**Constraints.** 1 ≤ capacity ≤ 1000; up to 10^4 commands  
**Example.** `2
enq 1;enq 2;enq 3;deq;enq 3;front;isfull` → `true true false 1 true 2 true` (The third enq fails; after deq 1 the queue is 2,3, front 2, and it is full: true true false 1 true 2 true.)  
**Example.** `1
deq;enq 4;isfull;deq;deq` → `-1 true true 4 -1` (deq on empty gives -1, then 4 fits, queue is full, deq returns 4, then empty again: -1 true true 4 -1.)  
**Hints.** Use a head index and a size counter. / The tail slot is (head + size) % capacity; deq advances head modulo capacity.  
**Approach.** Allocate an array of the given capacity with head=0 and size=0. enq writes at (head+size)%cap when size<cap. deq reads at head and moves head forward modulo cap, decrementing size. (O(1) per operation, O(capacity) space)  
**Edge cases.** Dequeue from empty; Wrap-around after several deq; Capacity 1

### Moving average meter
`dc-b-moving-average-meter` · easy · 25 min

Design a meter with window size k that receives numbers one at a time and, after each, reports the average of the last k numbers received (or of all numbers if fewer than k have arrived). Print each average with exactly two decimals.

**Input.** Line 1: k. Line 2: the values in arrival order.  
**Output.** One average per value, each with two decimal places.  
**Constraints.** 1 ≤ k ≤ 10^4; up to 10^5 values  
**Example.** `3
1 10 3 5` → `1.00 5.50 4.67 6.00` (Averages: 1, (1+10)/2=5.5, (1+10+3)/3=4.67, (10+3+5)/3=6.)  
**Example.** `2
4 4 8` → `4.00 4.00 6.00` (Averages: 4, 4, then (4+8)/2=6.)  
**Hints.** Recomputing the sum of the window each time is O(k). / Keep a running sum and a queue; subtract the value that leaves the window.  
**Approach.** Maintain a deque of the last k values and a running sum. Append each value, add it to the sum, and if the deque exceeds k remove the oldest value from both. The average is sum divided by deque length. (O(1) per value, O(k) space)  
**Edge cases.** Window larger than the stream; k = 1; Negative values

### Pair-sum stream
`dc-b-pair-sum-stream` · easy · 25 min

Design a structure that collects numbers with add x and answers find v: is there a pair of previously added numbers (two separate additions, equal values allowed if added twice) whose sum is v? Simulate the commands and print true or false for every find.

**Input.** One line of commands separated by semicolons.  
**Output.** The results of find commands, space-separated.  
**Constraints.** up to 10^4 commands; values up to 10^6 in absolute value  
**Example.** `add 1;add 3;add 5;find 4;find 7;add 3;find 6;find 2` → `true false true false` (1+3=4 works; no pair makes 7; after a second 3, 3+3=6 works; no pair makes 2: true false true false.)  
**Example.** `add 2;find 4;add 2;find 4` → `false true` (One 2 cannot pair with itself; two 2s can: false true.)  
**Hints.** A frequency map lets add run in O(1). / For find, loop over distinct stored values x and look up v-x; if v-x == x you need a count of at least 2.  
**Approach.** Store counts in a hash map. add increments a count. find iterates the distinct values x, checks whether v-x exists with count >= 2 when it equals x, or at least 1 otherwise. (O(1) add, O(d) find (d distinct values))  
**Edge cases.** Same value needs two copies; Negative target; Empty structure

### Stack with a bonus
`dc-b-stack-with-bonus` · easy · 25 min

Design a stack with a maximum size. push x does nothing when the stack is full, pop returns the top or -1 if empty, and inc k v adds v to each of the bottom k elements (or all of them if fewer than k exist). Print the result of every pop.

**Input.** Line 1: maximum size. Line 2: commands separated by semicolons.  
**Output.** The results of pop commands, space-separated.  
**Constraints.** 1 ≤ max size ≤ 1000; up to 10^4 commands  
**Example.** `3
push 1;push 2;pop;push 2;push 3;push 4;inc 5 100;pop;pop;pop;pop` → `2 103 102 101 -1` (The stack [1,2,3] gets +100 on all three; pops return 2, 103, 102, 101, -1 (push 4 was ignored): 2 103 102 101 -1.)  
**Example.** `2
push 5;inc 1 3;pop` → `8` (The only element rises from 5 to 8: 8.)  
**Hints.** A direct loop for inc is fine at these limits; can you make it O(1)? / Lazy increments: store a pending add per index and push it down to the element below when popping.  
**Approach.** Use an array stack with a parallel array of lazy increments. inc adds v to the lazy slot at index min(k,size)-1. On pop, return value plus its lazy amount and add the lazy amount to the slot below. (O(1) per operation with lazy increments, O(max size) space)  
**Edge cases.** push on a full stack; inc with k larger than size; pop on empty

### Phone number pool
`dc-b-number-pool` · easy · 25 min

A company owns phone numbers 0..n-1. get hands out the smallest free number (or -1 if none are left), check x says whether x is currently free, and release x makes a handed-out number free again (releasing a free number does nothing). Print the result of every get and check.

**Input.** Line 1: n. Line 2: commands separated by semicolons.  
**Output.** Results of get and check commands, space-separated.  
**Constraints.** 1 ≤ n ≤ 10^5; up to 10^5 commands  
**Example.** `3
get;get;check 1;release 0;get;get;get` → `0 1 false 0 2 -1` (Hand out 0 and 1; 1 is taken; after releasing 0, get returns 0, then 2, then -1: 0 1 false 0 2 -1.)  
**Example.** `1
check 0;get;check 0;release 0;check 0` → `true 0 false true` (Free, take it, taken, released, free again: true 0 false true.)  
**Hints.** You need the smallest free number quickly. / Keep a min-heap of free numbers and a set of used ones.  
**Approach.** Store free numbers in a min-heap and handed-out numbers in a set. get pops the heap and records the number; release pushes it back if it was in use; check tests set membership. (O(log n) per get/release, O(1) check)  
**Edge cases.** Release an unused number; Pool exhausted; Release then get returns the same number

### Undo-redo notepad
`dc-b-undo-redo-notepad` · easy · 25 min

Design a text pad. type w appends the word w (no spaces), undo reverts the most recent typing that has not been undone, redo reapplies the most recently undone typing, and typing anything new clears the redo history. show prints the current text, or EMPTY if it is empty. Undo and redo do nothing when there is nothing to undo or redo.

**Input.** One line of commands separated by semicolons.  
**Output.** The text at each show command, space-separated.  
**Constraints.** up to 10^4 commands  
**Example.** `type ab;type cd;undo;show;redo;show;undo;undo;show` → `ab abcd EMPTY` (After undo only ab; redo restores abcd; two undos empty the pad: ab abcd EMPTY.)  
**Example.** `type x;undo;type y;redo;show;undo;show;redo;show` → `y EMPTY y` (Typing y cleared the redo history, so the first redo does nothing and show gives y; undo empties the pad; the later redo brings y back: y EMPTY y.)  
**Hints.** Two stacks model history: one for done actions, one for undone ones. / Typing pushes on the undo stack and clears the redo stack; undo moves an item between stacks.  
**Approach.** Keep an undo stack and a redo stack of typed words and a text buffer. type appends, pushes on undo and clears redo; undo pops and removes that word from the end; redo pops from redo and re-appends. show prints the buffer. (O(len) per command in the worst case)  
**Edge cases.** Redo after new typing; Undo on empty history; Multiple undo then multiple redo

## dp

### Ways up the staircase
`dc-c-stair-ways` · easy · 20 min

A staircase has n steps and you climb either 1 or 2 steps at a time. Count the distinct sequences of moves that land exactly on step n, modulo 1 000 000 007.

**Input.** One integer n.  
**Output.** One integer: the number of ways modulo 1 000 000 007.  
**Constraints.** 1 ≤ n ≤ 10^6  
**Example.** `4` → `5` (1111, 112, 121, 211, 22: 5 ways.)  
**Example.** `1` → `1` (Only one single step.)  
**Hints.** To land on step n you came from n-1 or n-2. / That is the Fibonacci recurrence; keep only two values.  
**Approach.** ways[i] = ways[i-1] + ways[i-2] with ways[0] = ways[1] = 1, iterated with a rolling pair and reduced modulo 1e9+7. (O(n) time, O(1) space)  
**Edge cases.** n = 1; n = 2; Large n (modulo needed)

### Cheapest way up the stairs
`dc-c-cheap-stairs` · easy · 25 min

Each step i of a staircase has a fee c[i] charged when you leave that step by climbing 1 or 2 steps. You may start standing on step 0 or step 1, and you finish when you are beyond the last step. Find the minimum total fee.

**Input.** First line n; second line n non-negative fees.  
**Output.** One integer: the minimum total fee.  
**Constraints.** 2 ≤ n ≤ 10^5; 0 ≤ c[i] ≤ 1000  
**Example.** `3
10 15 20` → `15` (Start on step 1 (fee 15) and jump past the end: 15.)  
**Example.** `6
1 100 1 1 1 100` → `3` (Leave steps 0, 2 and 4 with two-step jumps: 1+1+1 = 3.)  
**Hints.** Let best[i] be the cheapest cost to be standing at position i without paying i's fee yet. / best[i] = min(best[i-1] + c[i-1], best[i-2] + c[i-2]).  
**Approach.** dp over positions 0..n with dp[0] = dp[1] = 0; the answer is dp[n], the cost of reaching the top beyond the last step. (O(n) time, O(1) space with rolling values)  
**Edge cases.** n = 2; All fees zero; Expensive steps at both ends

### Pick houses, skip neighbors
`dc-c-no-neighbor-loot` · easy · 25 min

Along a street, house i holds a[i] coins. You may collect from any set of houses as long as no two chosen houses are adjacent. Find the maximum coins you can collect.

**Input.** First line n; second line n non-negative integers.  
**Output.** One integer: the maximum total.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ a[i] ≤ 10^4  
**Example.** `4
2 7 9 3` → `11` (Take 2 and 9 for 11; 7 and 3 gives only 10.)  
**Example.** `3
5 1 5` → `10` (Take both ends: 10.)  
**Hints.** For house i either skip it or take it and skip i-1. / best[i] = max(best[i-1], best[i-2] + a[i]).  
**Approach.** Rolling dp over houses keeping the best total including up to i-1 and i-2, updated with max(skip, take). (O(n) time, O(1) space)  
**Edge cases.** Single house; Two houses; All zeros

### Fewest coins for the amount
`dc-c-min-coins` · easy · 30 min

A shop accepts n coin values with unlimited supply of each. Find the minimum number of coins whose values add up to exactly T, or -1 if it is impossible. Do not assume that greedy works for these values.

**Input.** First line n T; second line n positive coin values.  
**Output.** The minimum coin count, or -1.  
**Constraints.** 1 ≤ n ≤ 50; 0 ≤ T ≤ 10^4  
**Example.** `3 6
1 3 4` → `2` (3+3 uses two coins, better than 4+1+1.)  
**Example.** `1 7
2` → `-1` (Odd amount cannot be made from 2s.)  
**Hints.** Let best[x] be the fewest coins for amount x. / best[x] = 1 + min over coins c ≤ x of best[x-c].  
**Approach.** Bottom-up dp array of size T+1 with best[0] = 0 and infinity elsewhere; for each amount try every coin. Answer is best[T] or -1. (O(n · T) time, O(T) space)  
**Edge cases.** T = 0; Impossible amount; Greedy-fails case (1,3,4 for 6)

### Paths around the rocks
`dc-c-blocked-grid-paths` · easy · 30 min

A hiker walks from the top-left to the bottom-right of a grid, moving only right or down. Cells marked # are rocks and cannot be entered; . cells are free. Count the distinct routes modulo 1 000 000 007.

**Input.** First line R C, then R lines of C characters.  
**Output.** One integer: the number of routes modulo 1 000 000 007.  
**Constraints.** 1 ≤ R, C ≤ 1000  
**Example.** `3 3
...
.#.
...` → `2` (Two routes go around the rock in the center.)  
**Example.** `2 2
.#
#.` → `0` (Both routes are blocked.)  
**Hints.** Routes into a cell = routes into the cell above + routes into the cell to its left. / A rock cell always has 0 routes.  
**Approach.** dp[i][j] = 0 if rock else dp[i-1][j] + dp[i][j-1], seeded with dp[0][0] = 1 (if free). Reduce modulo 1e9+7. (O(R·C) time, O(C) space with a rolling row)  
**Edge cases.** Start is a rock; Single row; Fully free grid

### Cheapest walk across the grid
`dc-c-cheapest-grid-walk` · easy · 25 min

Every cell of an R by C grid has a toll. Starting at the top-left and moving only right or down, you must reach the bottom-right cell. You pay the toll of every cell you stand on, including the first and the last. Find the minimum total toll.

**Input.** First line R C, then R lines of C non-negative integers.  
**Output.** One integer: the minimum total toll.  
**Constraints.** 1 ≤ R, C ≤ 500; tolls ≤ 1000  
**Example.** `3 3
1 3 1
1 5 1
4 2 1` → `7` (Right, right, down, down: 1+3+1+1+1 = 7.)  
**Example.** `1 3
2 2 2` → `6` (Only one path.)  
**Hints.** You can only arrive from above or from the left. / Take the cheaper of the two predecessors.  
**Approach.** dp[i][j] = toll[i][j] + min(dp[i-1][j], dp[i][j-1]) with border cells using the single available predecessor. (O(R·C) time, O(C) space)  
**Edge cases.** Single cell; Single row or column; Zero tolls

### Best streak of the week
`dc-c-best-streak` · easy · 20 min

A shop records its daily profit (possibly negative) for n days. Find the largest total profit achievable over a non-empty run of consecutive days.

**Input.** First line n; second line n integers.  
**Output.** One integer: the maximum sum of a contiguous non-empty subarray.  
**Constraints.** 1 ≤ n ≤ 10^5; |a[i]| ≤ 10^4  
**Example.** `6
-2 3 4 -1 2 -5` → `8` (Days 2 to 5: 3+4-1+2 = 8.)  
**Example.** `3
-4 -1 -3` → `-1` (All losses: the best is just -1.)  
**Hints.** Decide at each day whether to extend the previous streak or start fresh. / cur = max(a[i], cur + a[i]).  
**Approach.** Kadane's algorithm: keep the best sum of a streak ending at the current day and the global best over all days. (O(n) time, O(1) space)  
**Edge cases.** All negative; Single element; Large positive prefix then negatives

### Tile a 2-by-n floor
`dc-c-domino-tilings` · easy · 25 min

A hallway floor is 2 rows by n columns. You have unlimited 1-by-2 dominoes, which can lie flat or stand upright. Count the ways to tile the floor completely, modulo 1 000 000 007.

**Input.** One integer n.  
**Output.** One integer: the number of tilings modulo 1 000 000 007.  
**Constraints.** 1 ≤ n ≤ 10^6  
**Example.** `3` → `3` (Three upright; upright then a flat pair; flat pair then upright.)  
**Example.** `1` → `1` (A single upright domino.)  
**Hints.** Look at the leftmost column: it is covered by an upright domino or by two flat ones. / That leaves a floor of width n-1 or n-2.  
**Approach.** f(n) = f(n-1) + f(n-2) with f(1) = 1, f(2) = 2. Compute iteratively with two variables modulo 1e9+7. (O(n) time, O(1) space)  
**Edge cases.** n = 1; n = 2; Large n

### Split into dictionary words
`dc-c-word-split` · easy · 30 min

Given a string without spaces and a dictionary of words, decide whether the string can be split into a sequence of dictionary words. Words may be used any number of times.

**Input.** First line the string; second line k; then k dictionary words, one per line.  
**Output.** YES if a split exists, otherwise NO.  
**Constraints.** 1 ≤ length ≤ 1000; 1 ≤ k ≤ 1000; words are lowercase  
**Example.** `catsanddog
4
cat
cats
and
dog` → `YES` (cats + and + dog.)  
**Example.** `catsandog
3
cats
and
dog` → `NO` (After 'cats' and 'and', only 'og' remains.)  
**Hints.** ok[i] means the first i characters can be split. / ok[i] is true if some earlier ok[j] is true and w[j:i] is a word.  
**Approach.** Boolean dp over prefixes with ok[0] = true; for each end i test every split j with a set lookup. Answer is ok[n]. (O(n²) substring checks (times word length), O(n) space)  
**Edge cases.** Word reused multiple times; No valid prefix; Overlapping dictionary words

### Split into equal halves
`dc-c-equal-halves` · easy · 30 min

Given n positive integers, decide whether they can be divided into two groups (every number in exactly one group) with the same sum.

**Input.** First line n; second line n positive integers.  
**Output.** YES if such a split exists, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 100; each ≤ 100  
**Example.** `4
1 5 11 5` → `YES` (11 on one side, 1+5+5 on the other.)  
**Example.** `3
1 2 5` → `NO` (Total 8 halves to 4, which is unreachable.)  
**Hints.** If the total is odd the answer is immediately NO. / Now ask whether some subset sums to total/2.  
**Approach.** Subset-sum dp: boolean array up to total/2, updating from high to low for each number. Answer is dp[total/2]. (O(n · total) time, O(total) space)  
**Edge cases.** Odd total; Single element; Large element exceeding half

## graphs

### Count the friend clusters
`dc-c-friend-clusters` · easy · 20 min

A school has n students numbered 1..n. Some pairs are direct friends, and friendship spreads: friends of friends, and so on, all belong to one cluster. Count how many clusters exist (a student with no friends is a cluster by themselves).

**Input.** First line n and m, followed by m lines each with two student numbers u v.  
**Output.** One integer: the number of clusters.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `6 3
1 2
2 3
4 5` → `3` (Clusters are {1,2,3}, {4,5} and {6}.)  
**Example.** `4 0` → `4` (Nobody is friends, so each student is alone.)  
**Hints.** Think of students as nodes and friendships as undirected edges. / Walk from each unvisited node with BFS or DFS and count how many walks you start.  
**Approach.** Build adjacency lists and run an iterative DFS/BFS from each unvisited node, counting starts. A union-find structure works equally well. (O(n + m) time, O(n + m) space)  
**Edge cases.** m = 0; Fully connected graph; Duplicate friendship lines

### Fewest hops between stations
`dc-c-fewest-hops` · easy · 20 min

A subway has n stations connected by two-way tunnels. Every tunnel takes one hop regardless of length. Find the smallest number of hops needed to get from station a to station b, or report that you cannot get there.

**Input.** First line n m a b, followed by m lines each with a tunnel u v.  
**Output.** The minimum number of hops, or -1 if b is unreachable.  
**Constraints.** 2 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; a ≠ b  
**Example.** `5 4 1 5
1 2
2 3
3 5
1 4` → `3` (Best route is 1-2-3-5, three hops.)  
**Example.** `4 1 1 4
1 2` → `-1` (Station 4 is isolated, so -1.)  
**Hints.** Every edge costs the same, so which traversal order finds shortest routes first? / Use BFS from a and record distances; unvisited means unreachable.  
**Approach.** Run BFS from a, storing the distance when each node is first discovered. The distance of b is the answer, or -1 if it was never reached. (O(n + m) time, O(n + m) space)  
**Edge cases.** Target unreachable; Direct tunnel between a and b; Several equal-length routes

### Rooms and their keys
`dc-c-key-rooms` · easy · 20 min

A mansion has n rooms numbered 0..n-1, and only room 0 is unlocked at the start. Each room contains some keys, and each key opens exactly one room (keys can be reused and never break). Decide whether you can eventually enter every room.

**Input.** First line n; then n lines, line i starting with a count c followed by c room numbers, the keys found in room i.  
**Output.** YES if every room can be entered, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^4; total keys ≤ 10^5  
**Example.** `4
2 1 2
1 3
0
0` → `YES` (Room 0 gives keys to 1 and 2, room 1 gives a key to 3.)  
**Example.** `3
1 1
0
1 0` → `NO` (Nobody holds a key to room 2, so it stays locked.)  
**Hints.** Rooms are nodes, and a key in room i for room j is a directed edge i -> j. / Run a DFS/BFS from room 0 and compare the visited count with n.  
**Approach.** Treat keys as directed edges and traverse from room 0 with a stack, marking rooms visited. If all n rooms get visited the answer is YES. (O(n + keys) time, O(n) space)  
**Edge cases.** n = 1; Keys pointing back to already visited rooms; Room with no keys that blocks progress

### The busiest airport
`dc-c-popular-hub` · easy · 20 min

An airline flies direct routes between n airports, each route usable in both directions and listed once. The busiest airport is the one with the most routes touching it. Print that airport and its route count; if several tie, choose the smallest number.

**Input.** First line n m, followed by m lines each with two airports u v.  
**Output.** Two integers: the busiest airport and its degree.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; no repeated routes  
**Example.** `5 4
1 2
1 3
2 3
3 4` → `3 3` (Airport 3 touches routes to 1, 2 and 4.)  
**Example.** `3 1
1 2` → `1 1` (Airports 1 and 2 tie with one route, pick 1.)  
**Hints.** You do not need adjacency lists, only counts. / Add one to both endpoints per edge, then scan for the maximum.  
**Approach.** Keep a degree array, incrementing both endpoints per edge. Scan from index 1 upward keeping the first index with the strictly largest degree. (O(n + m) time, O(n) space)  
**Edge cases.** m = 0 (answer is 1 0); Tie for first place; Star graph

### Find the quiet mayor
`dc-c-quiet-mayor` · easy · 20 min

In a village of n people, a line a b means person a trusts person b (one direction only). The mayor trusts nobody, yet everybody else trusts the mayor. Find the mayor, or report that there is none.

**Input.** First line n m, followed by m lines each with a b meaning a trusts b.  
**Output.** The mayor's number, or -1 if no one qualifies.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 3·10^5; no duplicate lines, a ≠ b  
**Example.** `3 2
1 3
2 3` → `3` (Person 3 trusts nobody and is trusted by both others.)  
**Example.** `3 3
1 2
2 3
3 1` → `-1` (Everyone trusts someone, so there is no mayor.)  
**Hints.** Count how many people each person trusts and how many trust them. / The mayor has out-degree 0 and in-degree n-1.  
**Approach.** Compute in-degree and out-degree arrays in one pass over the edges, then return the node with out 0 and in n-1. At most one node can satisfy this. (O(n + m) time, O(n) space)  
**Edge cases.** n = 1 and m = 0 (the lone person is mayor); Everyone trusts the mayor but the mayor trusts someone; No edges with n > 1

### Who is within reach
`dc-c-within-reach` · easy · 20 min

A rumor starts at person a and each day passes along every two-way acquaintance link from people who already know it. After exactly k days, how many people other than a know the rumor? Everyone connected by a path of at most k links hears it.

**Input.** First line n m a k, followed by m lines each with a link u v.  
**Output.** One integer: the count of people (excluding a) within k links of a.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5; 0 ≤ k ≤ 10^5  
**Example.** `5 4 1 2
1 2
2 3
3 4
4 5` → `2` (Within two links of 1 are 2 and 3.)  
**Example.** `4 3 1 1
1 2
1 3
1 4` → `3` (All three neighbors are one link away.)  
**Hints.** BFS gives the minimum number of links to each person. / Count nodes whose distance is between 1 and k.  
**Approach.** Run BFS from a to get distances, then count nodes other than a whose distance is at most k. Unreached nodes are never counted. (O(n + m) time, O(n + m) space)  
**Edge cases.** k = 0 (answer 0); Disconnected graph; k larger than any distance

### Is this network a tree
`dc-c-is-it-a-tree` · easy · 20 min

A network of n servers is joined by m two-way cables. It is called tree-shaped if every server can reach every other and removing any cable would break that. Decide whether the network is tree-shaped.

**Input.** First line n m, followed by m lines each with a cable u v.  
**Output.** YES if the network is tree-shaped, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `4 3
1 2
2 3
3 4` → `YES` (A simple chain: connected with n-1 cables.)  
**Example.** `4 3
1 2
2 3
3 1` → `NO` (Three cables but server 4 is cut off and there is a loop.)  
**Hints.** A tree on n nodes always has exactly n-1 edges. / Having n-1 edges is not enough; also check that everything is connected.  
**Approach.** Reject immediately unless m = n-1. Then check connectivity with BFS/DFS or union-find; connected plus n-1 edges implies no cycles. (O(n + m) time, O(n) space)  
**Edge cases.** n = 1, m = 0; n-1 edges but disconnected; Self-loop or repeated cable

### Reachable from both
`dc-c-common-reach` · easy · 25 min

A city has n bus stops and m one-way bus lines. Two friends start at stops a and b. Count how many stops (including their own start stops, if applicable) can be reached by both friends using any number of bus lines.

**Input.** First line n m a b, followed by m lines each with a one-way line u v.  
**Output.** One integer: the number of stops reachable from both a and b.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `5 4 1 2
1 3
2 3
3 4
2 5` → `2` (From 1: {1,3,4}. From 2: {2,3,4,5}. Shared: 3 and 4.)  
**Example.** `3 0 1 2` → `0` (Each only reaches its own start, no overlap.)  
**Hints.** Do one traversal per friend and keep each visited set. / Intersect the two sets and count.  
**Approach.** Run a directed DFS from a and another from b, producing two visited arrays. The answer is the number of nodes marked in both. (O(n + m) time, O(n) space)  
**Edge cases.** a and b can reach each other; a == b; No lines at all

## greedy

### Fewest notes and coins
`dc-c-fewest-notes` · easy · 20 min

A cash register holds unlimited notes and coins worth 1, 2, 5, 10, 20, 50 and 100. For a given payout amount, find the smallest number of pieces that add up to exactly that amount.

**Input.** One integer a.  
**Output.** One integer: the minimum number of pieces.  
**Constraints.** 0 ≤ a ≤ 10^9  
**Example.** `289` → `8` (100+100+50+20+10+5+2+2 is 8 pieces.)  
**Example.** `7` → `2` (5+2 is two pieces.)  
**Hints.** Try the largest piece first. / For this particular set of values, taking the largest piece that fits is always optimal.  
**Approach.** Greedily take as many of the largest denomination as fit, then move to the next. This set is canonical, so greedy is optimal. (O(1) time (7 denominations), O(1) space)  
**Edge cases.** a = 0; Exactly one denomination; Very large a

### Attend the most talks
`dc-c-most-talks` · easy · 25 min

At a conference there are n talks, each with a start and end time. You can attend a talk only entirely, and you may begin a talk at the exact moment another one ends. Find the largest number of talks you can attend.

**Input.** First line n, then n lines each with start end.  
**Output.** One integer: the maximum number of talks.  
**Constraints.** 1 ≤ n ≤ 10^5; start < end  
**Example.** `4
1 3
2 4
3 5
6 7` → `3` (Take 1-3, 3-5, 6-7.)  
**Example.** `3
1 10
2 3
4 5` → `2` (Skip the long talk and take the two short ones.)  
**Hints.** Sort by something other than start time. / Finishing earliest leaves the most room for the future.  
**Approach.** Sort talks by end time and greedily accept each talk whose start is at least the end of the last accepted one. (O(n log n) time, O(1) extra space)  
**Edge cases.** All overlap; Back-to-back talks; Single talk

### Hand out the cookies
`dc-c-cookie-match` · easy · 20 min

Children each demand a minimum cookie size, and you have cookies of various sizes. Each child gets at most one cookie and each cookie goes to at most one child. A child is content if the cookie is at least as large as their demand. Maximize the number of content children.

**Input.** First line n m; second line n demands; third line m cookie sizes.  
**Output.** One integer: the maximum number of content children.  
**Constraints.** 1 ≤ n, m ≤ 10^5  
**Example.** `3 2
1 2 3
1 1` → `1` (Both cookies have size 1, so only one child can be made content.)  
**Example.** `2 3
1 2
1 2 3` → `2` (Cookie 1 for demand 1, cookie 2 for demand 2.)  
**Hints.** Sort both lists. / Give each cookie to the least demanding unsatisfied child it can satisfy.  
**Approach.** Sort demands and sizes, walk through cookies in increasing size with a pointer into demands, advancing the pointer when a cookie satisfies the current child. (O(n log n + m log m) time, O(1) extra space)  
**Edge cases.** No cookie big enough; More cookies than children; Duplicates

### Can you reach the last stone
`dc-c-can-reach-end` · easy · 20 min

Stones are laid in a row, and standing on stone i lets you jump forward by any distance from 0 to a[i]. Starting on the first stone, decide whether you can reach the last one.

**Input.** First line n; second line n non-negative integers a[i].  
**Output.** YES if the last stone is reachable, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ a[i] ≤ 10^5  
**Example.** `5
2 3 1 0 4` → `YES` (Jump 1 to stone 2, then 3 steps to the end.)  
**Example.** `4
2 1 0 5` → `NO` (Every path gets stuck at the zero.)  
**Hints.** Track the farthest index reachable so far. / If you reach an index beyond that farthest point, you are stuck.  
**Approach.** Scan left to right keeping far = max(far, i + a[i]). If i exceeds far at any step the answer is NO; otherwise YES. (O(n) time, O(1) space)  
**Edge cases.** n = 1; Zero at the start with n > 1; Large jump at the beginning

### Collect every price rise
`dc-c-stock-swings` · easy · 20 min

You know a stock's price for each of n days. You may buy and sell as often as you like, but hold at most one share and must sell before buying again. Compute the maximum total profit.

**Input.** First line n; second line n daily prices.  
**Output.** One integer: the maximum profit.  
**Constraints.** 1 ≤ n ≤ 10^5; prices ≤ 10^4  
**Example.** `6
7 1 5 3 6 4` → `7` (Buy at 1 sell at 5, buy at 3 sell at 6: 4 + 3 = 7.)  
**Example.** `4
5 4 3 2` → `0` (Prices only fall, so no trades.)  
**Hints.** Consider each pair of adjacent days. / A multi-day climb equals the sum of its daily rises.  
**Approach.** Sum every positive difference between consecutive days. This equals the best set of non-overlapping trades. (O(n) time, O(1) space)  
**Edge cases.** Single day; Strictly decreasing; Flat prices

### Flip signs for the biggest total
`dc-c-flip-for-profit` · easy · 25 min

You have n numbers and must perform exactly k operations. Each operation picks one number (the same one may be chosen again) and multiplies it by -1. Choose operations to maximize the sum of the numbers afterwards.

**Input.** First line n k; second line n integers.  
**Output.** One integer: the maximum possible sum.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ k ≤ 10^9; |a[i]| ≤ 10^4  
**Example.** `3 1
2 -3 5` → `10` (Flip -3 to 3: sum 10.)  
**Example.** `3 3
1 2 3` → `4` (Flip the smallest number three times, leaving -1+2+3 = 4.)  
**Hints.** Flipping a negative number to positive always helps. / If flips remain after all negatives are gone, only parity matters.  
**Approach.** Sort ascending, flip the most negative numbers first while k lasts. If an odd number of flips remain, subtract twice the smallest absolute value. (O(n log n) time, O(1) extra space)  
**Edge cases.** k larger than n; Zeros present (extra flips are free); No negatives and odd k

### Lifeboats for everyone
`dc-c-lifeboats` · easy · 25 min

People with known weights must cross a river in boats. Each boat carries at most two people and a total weight of at most L. Every person's weight is at most L. Find the minimum number of boats.

**Input.** First line n L; second line n weights.  
**Output.** One integer: the minimum number of boats.  
**Constraints.** 1 ≤ n ≤ 10^5; weights ≤ L ≤ 10^9  
**Example.** `4 10
9 1 5 5` → `2` (Pair 9+1 and 5+5.)  
**Example.** `3 5
4 4 4` → `3` (No two can share, so three boats.)  
**Hints.** Sort the weights. / Try to pair the heaviest remaining person with the lightest.  
**Approach.** Sort and use two pointers: the heaviest always boards; the lightest joins if the sum fits. Count boats until pointers cross. (O(n log n) time, O(1) extra space)  
**Edge cases.** Single person; Everyone fits in pairs; No pairs fit

### Cut into balanced pieces
`dc-c-balanced-splits` · easy · 20 min

A string made only of the letters L and R has an equal number of each. Cut it into the largest possible number of consecutive pieces so that every piece also has equally many L and R. Print that number of pieces.

**Input.** One string of L and R with equal counts.  
**Output.** One integer: the maximum number of pieces.  
**Constraints.** 2 ≤ length ≤ 10^5, even  
**Example.** `RLRRLLRLRL` → `4` (Pieces: RL, RRLL, RL, RL.)  
**Example.** `LLRR` → `1` (Cutting inside breaks the balance; one piece.)  
**Hints.** Treat L as +1 and R as -1 and watch the running total. / Each time the total returns to 0, you can end a piece.  
**Approach.** Maintain a running balance; whenever it hits zero, finish a piece and increment the counter. Cutting at every zero maximizes pieces. (O(n) time, O(1) space)  
**Edge cases.** Entire string is one piece; Alternating letters; Starts with a long run

## grids

### Fence around the garden
`dc-c-garden-fence` · easy · 20 min

A map shows a field as R rows and C columns, where # is a planted plot and . is bare soil. A fence is needed along every plot side that does not touch another plot (map edges count as open). Compute the total fence length, with each plot side having length 1.

**Input.** First line R C, then R lines of C characters each.  
**Output.** One integer: the total fence length.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `3 3
.#.
###
.#.` → `12` (A plus shape has 12 exposed sides.)  
**Example.** `1 1
#` → `4` (A lone plot has four sides.)  
**Hints.** Look at each plot cell separately. / For each of its four neighbors, add 1 if it is outside the map or not a plot.  
**Approach.** Scan every # cell and count the neighbors (up, down, left, right) that are out of bounds or not #. The sum is the answer; no traversal is needed. (O(R·C) time, O(1) extra space)  
**Edge cases.** No plots (answer 0); Single row; Fully filled grid

### The biggest forest patch
`dc-c-biggest-patch` · easy · 25 min

A satellite image is a grid where # marks forest and . marks open ground. Forest cells touching up, down, left or right belong to the same patch. Report the number of cells in the largest patch, or 0 if there is no forest.

**Input.** First line R C, then R lines of C characters each.  
**Output.** One integer: the size of the largest patch.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `3 4
##..
#..#
..##` → `3` (The left patch has 3 cells, the right one has 3; largest is 3.)  
**Example.** `2 2
..
..` → `0` (No forest.)  
**Hints.** Flood from an unvisited # cell and count what you reach. / Use an explicit stack or queue to avoid deep recursion on big grids.  
**Approach.** For each unvisited # cell run a DFS/BFS over 4-neighbors counting cells, and track the maximum count seen. (O(R·C) time, O(R·C) space)  
**Edge cases.** No forest; Whole grid is one patch; Diagonal-only contact does not join patches

### Steps through the maze
`dc-c-maze-steps` · easy · 25 min

A maze is drawn on a grid: S is the start, E is the exit, . is open floor and # is wall. Each move goes one cell up, down, left or right onto a non-wall cell. Find the fewest moves needed to reach E from S, or -1 if it cannot be done.

**Input.** First line R C, then R lines of C characters with exactly one S and one E.  
**Output.** The minimum number of moves, or -1.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `3 4
S..#
.#..
...E` → `5` (Down, down, right, right, right is 5 moves.)  
**Example.** `2 3
S#E
.#.` → `-1` (The wall column blocks every route.)  
**Hints.** All moves cost the same, so use breadth-first search. / Store distance per cell when you first enqueue it.  
**Approach.** BFS from S over open cells, recording distance on first visit. Return the distance when E is dequeued, or -1 if the queue empties. (O(R·C) time, O(R·C) space)  
**Edge cases.** Blocked exit; S adjacent to E; Single-row maze

### Paint bucket tool
`dc-c-paint-bucket` · easy · 25 min

A tiny image is a grid of letters, each letter being a color. A paint bucket click at a given cell replaces that cell's color, and every cell connected to it through up/down/left/right neighbors of the same original color, with a new color. Print the image after the click.

**Input.** First line R C, then R image rows, then a line r c ch with a 1-indexed cell and the new letter.  
**Output.** The R rows of the image after painting.  
**Constraints.** 1 ≤ R, C ≤ 300  
**Example.** `3 3
aab
abb
bba
1 1 z` → `zzb
zbb
bba` (The connected a-region {(1,1),(1,2),(2,1)} becomes z; the a at (3,3) is separate.)  
**Example.** `2 2
xx
xx
2 2 x` → `xx
xx` (New color equals old color, nothing changes.)  
**Hints.** Remember the original color before overwriting anything. / If the new color equals the old one, stop early to avoid an endless loop.  
**Approach.** Read the target cell's color, then DFS/BFS over 4-neighbors with that same color, overwriting each as it is visited. Overwriting doubles as the visited mark. (O(R·C) time, O(R·C) space)  
**Edge cases.** New color same as old; Click on a single isolated cell; Region touching all four borders

### Islands that touch at corners
`dc-c-diagonal-islands` · easy · 25 min

On a map, # is land and . is water. Two land cells belong to the same island if they share a side or a corner (so eight directions). Count the islands.

**Input.** First line R C, then R lines of C characters.  
**Output.** One integer: the number of islands.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `3 3
#..
.#.
..#` → `1` (The three cells touch diagonally, so one island.)  
**Example.** `3 3
#.#
...
#.#` → `4` (Four corner cells are not adjacent in any direction.)  
**Hints.** This is ordinary component counting with a bigger neighbor list. / Use the 8 offsets (dx,dy) with dx,dy in {-1,0,1} except (0,0).  
**Approach.** Count connected components of # cells using DFS/BFS with eight neighbor offsets, marking cells visited as you go. (O(R·C) time, O(R·C) space)  
**Edge cases.** All water; Checkerboard pattern; Single cell

### Count the lonely stars
`dc-c-lonely-stars` · easy · 20 min

A night-sky chart is a grid where * is a star and . is empty sky. A star is lonely if none of the four cells directly above, below, left or right of it also holds a star. Count the lonely stars.

**Input.** First line R C, then R lines of C characters.  
**Output.** One integer: the number of lonely stars.  
**Constraints.** 1 ≤ R, C ≤ 1000  
**Example.** `3 4
*.**
....
*..*` → `3` ((1,1), (3,1) and (3,4) are lonely; the pair at the top right is not.)  
**Example.** `1 3
***` → `0` (The ends and middle all have a star neighbor.)  
**Hints.** You only need to inspect the four direct neighbors. / Guard against stepping outside the grid.  
**Approach.** Visit each * and check its four neighbors with bounds checks. Count the stars that have none. (O(R·C) time, O(1) extra space)  
**Edge cases.** Star in a corner; No stars; Single cell grid with a star

### How much can the explorer see
`dc-c-explorer-range` · easy · 20 min

A robot starts on the cell marked S of a grid where . is floor and # is wall. It moves one cell at a time up, down, left or right and cannot enter walls. Count how many distinct cells it can ever stand on, including its starting cell.

**Input.** First line R C, then R lines of C characters with exactly one S.  
**Output.** One integer: the number of reachable cells.  
**Constraints.** 1 ≤ R, C ≤ 700  
**Example.** `3 3
S.#
.##
#..` → `3` (Only S and its two neighbors are reachable.)  
**Example.** `1 1
S` → `1` (Just the start cell.)  
**Hints.** Keep a visited set so each cell is counted once. / DFS or BFS both work.  
**Approach.** Flood fill from S over non-wall cells and return the number of visited cells. (O(R·C) time, O(R·C) space)  
**Edge cases.** Start completely walled in; Open grid; S in a corner

### Fill in the mine numbers
`dc-c-mine-numbers` · easy · 25 min

A minefield grid marks mines with * and safe cells with . . Replace every safe cell with the number of mines among its up to eight surrounding cells, keeping mines as *. Print the resulting board.

**Input.** First line R C, then R lines of C characters.  
**Output.** R lines of the completed board.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `2 3
*..
..*` → `*21
12*` (Middle top cell touches both mines, the others touch one.)  
**Example.** `1 3
.*.` → `1*1` (Both safe cells touch the one mine.)  
**Hints.** Loop over all cells and look in 8 directions. / A mine cell is never replaced.  
**Approach.** For each non-mine cell count mine cells among the eight neighbors with bounds checks, then write the digit. A single pass over the grid suffices. (O(R·C) time, O(R·C) space for output)  
**Edge cases.** No mines; All mines; Single column

### Does the water seep through
`dc-c-seep-through` · easy · 25 min

Water is poured over the top of a rock slab drawn as a grid, where . is a pore and # is solid rock. Water flows from any pore in the top row to adjacent pores (up, down, left, right). Decide whether it can reach any pore in the bottom row.

**Input.** First line R C, then R lines of C characters.  
**Output.** YES if water reaches the bottom row, otherwise NO.  
**Constraints.** 1 ≤ R, C ≤ 500  
**Example.** `3 3
.#.
.#.
...` → `YES` (Down the left column then along the bottom.)  
**Example.** `2 3
.#.
#.#` → `NO` (The pores at the top and bottom only touch diagonally.)  
**Hints.** Start the traversal from every pore of the top row at once. / Return as soon as you pop a cell in the last row.  
**Approach.** Multi-source DFS/BFS seeded with all top-row pores over 4-neighbors. If any visited cell is in row R-1, the answer is YES. (O(R·C) time, O(R·C) space)  
**Edge cases.** One-row grid; Top row fully blocked; Winding path

## hashing

### Matching pair of prices
`dc-a-matching-pair` · easy · 20 min

A shopper has a list of item prices and a budget. Exactly one pair of different positions has prices that add up to the budget. Print the two 0-based positions, smaller first.

**Input.** Line 1: n prices; line 2: the budget.  
**Output.** Two indices i j with i < j.  
**Constraints.** 2 ≤ n ≤ 10^5; exactly one valid pair  
**Example.** `2 7 11 15
9` → `0 1` (2 + 7 = 9.)  
**Example.** `5 1 9 6
7` → `1 3` (1 + 6 = 7 at positions 1 and 3; no other pair works.)  
**Hints.** For each price you need budget - price to have been seen already. / Store value to index in a hash map as you scan.  
**Approach.** Scan left to right, looking up the complement in a hash map of values seen so far. When found, return its stored index and the current one; otherwise store the current value. (O(n) time, O(n) extra space)  
**Edge cases.** equal prices (3 3); negative prices; pair at the very ends

### Repeat visitor
`dc-a-repeat-visitor` · easy · 20 min

A door logs the badge id of each visitor in order. A repeat visit is suspicious if the same badge id appears at two positions i and j with j - i ≤ k. Print whether any suspicious pair exists.

**Input.** Line 1: n badge ids; line 2: the integer k.  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ k ≤ 10^5  
**Example.** `1 2 3 1
3` → `true` (The 1s are 3 positions apart, which is ≤ 3.)  
**Example.** `1 2 3 1
2` → `false` (Distance 3 exceeds 2.)  
**Hints.** Only the most recent position of each id matters. / Store last index per id in a hash map.  
**Approach.** Keep a map from id to its latest index. On seeing an id again, check whether the distance to the stored index is at most k; update the stored index each time. (O(n) time, O(n) extra space)  
**Edge cases.** k larger than n; no duplicates; adjacent duplicates

### Anagram clubs
`dc-a-anagram-clubs` · easy · 25 min

Words that are anagrams of each other form one club. Given a list of lowercase words, count how many clubs there are.

**Input.** One line of space-separated words.  
**Output.** One integer: the number of clubs.  
**Constraints.** 1 ≤ words ≤ 10^4; each length ≤ 50  
**Example.** `listen silent enlist google gogole cat act` → `3` ({listen, silent, enlist}, {google, gogole}, {cat, act}.)  
**Example.** `a b a` → `2` ("a" appears twice but is one club, plus "b".)  
**Hints.** Anagrams share a canonical form. / Use the sorted letters (or a count signature) as the hash key.  
**Approach.** Map each word to its sorted-letters signature and put signatures in a set. The size of the set is the number of clubs. (O(total length * log) time, O(total length) space)  
**Edge cases.** duplicate words; single word; all different

### One-to-one code
`dc-a-one-to-one-code` · easy · 25 min

Two strings of equal length follow the same code if you can replace each distinct letter of the first by one distinct letter of the second, consistently and one-to-one, to turn the first into the second. Decide whether they do.

**Input.** Two lines, one string each.  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `paper
title` → `true` (p→t, a→i, e→l, r→e works in both directions.)  
**Example.** `foo
bar` → `false` (o would have to map to both a and r.)  
**Hints.** You need a mapping and also its inverse. / Reject if either direction conflicts.  
**Approach.** Maintain two hash maps, first-to-second and second-to-first. For each aligned pair of characters, any inconsistency in either map means false. (O(n) time, O(1) extra space for a fixed alphabet)  
**Edge cases.** different lengths; two letters mapping to one; length 1

### First to repeat
`dc-a-first-to-repeat` · easy · 20 min

In a stream of numbers, the first number to repeat is the one whose second occurrence appears earliest in the stream. Print it, or -1 if nothing repeats.

**Input.** One line of n integers.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `3 1 4 1 5 3` → `1` (The second 1 (index 3) comes before the second 3 (index 5).)  
**Example.** `1 2 3` → `-1` (All distinct.)  
**Hints.** Which element is repeated is decided at the moment of the second occurrence. / Scan with a set and stop at the first element already in it.  
**Approach.** Scan left to right with a hash set. The first element found already in the set is the answer; if the scan ends, print -1. (O(n) time, O(n) space)  
**Edge cases.** no repeats; immediate repeat; n = 1

### Fans of both bands
`dc-a-common-fans` · easy · 20 min

Two bands each list the ids of their fans (an id may be listed more than once). Print the ids that appear in both lists, each once, in increasing order, or "-" if there are none.

**Input.** Two lines of integers.  
**Output.** Sorted common ids, or "-".  
**Constraints.** 1 ≤ each length ≤ 10^5  
**Example.** `4 9 5 9
9 4 9 8 4` → `4 9` (4 and 9 occur in both lists.)  
**Example.** `1 2
3 4` → `-` (No overlap.)  
**Hints.** Convert one list to a set. / Collect elements of the other that are in the set, dedupe and sort.  
**Approach.** Build sets from both lists, intersect them, and print the sorted result (or "-" if empty). (O(n log n) time, O(n) space)  
**Edge cases.** no overlap; all equal; negative ids

### Top trending tags
`dc-a-top-trending` · easy · 25 min

Each post carries a numeric tag id. Print the k tag ids that appear most often, most frequent first. If two tags appear equally often, the smaller id comes first.

**Input.** Line 1: n tag ids; line 2: the integer k.  
**Output.** k ids separated by spaces.  
**Constraints.** 1 ≤ k ≤ number of distinct ids ≤ n ≤ 10^5  
**Example.** `1 1 1 2 2 3
2` → `1 2` (1 appears 3 times, 2 appears twice.)  
**Example.** `4 4 5 5 6
2` → `4 5` (4 and 5 tie at 2; smaller id first; 6 only once.)  
**Hints.** Count with a hash map. / Sort distinct ids by (-count, id) and take the first k.  
**Approach.** Count occurrences with a map, sort the distinct ids with key (-count, id), and output the first k. (O(n + d log d) time for d distinct ids, O(d) space)  
**Edge cases.** ties in count; k equals distinct count; negative ids

## heaps

### k-th biggest score
`dc-b-kth-biggest-score` · easy · 25 min

Given a list of scores, find the k-th largest one, counting duplicates separately (so in 5 5 5 the 2nd largest is 5). Try to do better than sorting the whole list when k is small.

**Input.** Line 1: the scores. Line 2: k.  
**Output.** The k-th largest score.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5  
**Example.** `9 4 7 1 8 2
3` → `7` (Descending order is 9 8 7 4 2 1, so the 3rd is 7.)  
**Example.** `5 5 5
2` → `5` (Duplicates count: the 2nd largest is still 5.)  
**Hints.** You only need to remember the k largest scores seen so far. / Keep a min-heap of size k; if it grows past k, pop the smallest. The root is the answer.  
**Approach.** Maintain a min-heap holding the k largest values. Push each score and pop when the heap exceeds k elements. After the scan the heap's top is the k-th largest. (O(n log k) time, O(k) space)  
**Edge cases.** k = 1; k = n; All values equal

### Boulder smash
`dc-b-boulder-smash` · easy · 25 min

Each round, take the two heaviest boulders and smash them together. If their weights are equal both vanish; otherwise the lighter vanishes and the heavier is left with the weight difference. Continue until at most one boulder remains and print its weight (0 if none).

**Input.** One line of positive integers, the boulder weights.  
**Output.** The weight of the last boulder, or 0.  
**Constraints.** 1 ≤ n ≤ 10^5; weights up to 10^9  
**Example.** `7 4 3 3` → `3` (7 and 4 leave 3; then 3,3,3: two 3s vanish, one 3 remains.)  
**Example.** `5 5` → `0` (They cancel completely: 0.)  
**Hints.** You repeatedly need the largest elements. / Use a max-heap (negate values in a min-heap): pop two, push back the difference if non-zero.  
**Approach.** Put all weights in a max-heap. While at least two remain, pop the two largest and push back their difference if it is non-zero. The heap's last element, if any, is the answer. (O(n log n) time, O(n) space)  
**Edge cases.** Single boulder; All cancel; Equal pairs repeatedly

### Most requested items
`dc-b-most-requested` · easy · 25 min

A shop logs the ID of every item that was requested. Find the k most frequently requested IDs, most frequent first; if two IDs are requested equally often, the smaller ID comes first.

**Input.** Line 1: the logged IDs. Line 2: k.  
**Output.** k IDs separated by spaces.  
**Constraints.** 1 ≤ k ≤ number of distinct IDs ≤ n ≤ 10^5  
**Example.** `1 1 1 2 2 3
2` → `1 2` (ID 1 appears 3 times and ID 2 twice.)  
**Example.** `4 4 5 5 6
1` → `4` (4 and 5 tie with two requests, and the smaller ID 4 wins.)  
**Hints.** Count first, then select. / Put (-count, id) in a heap of the distinct IDs, or keep a size-k heap keyed by count and ID.  
**Approach.** Count frequencies with a hash map, then use a heap (or a sort) keyed by (-count, id) to pull out the k best IDs. (O(n + d log k) time, O(d) space (d = distinct IDs))  
**Edge cases.** All IDs distinct; Ties at the cut-off; k = number of distinct IDs

### Join the ropes
`dc-b-join-the-ropes` · easy · 25 min

You have ropes of various lengths and can tie two together at a cost equal to the sum of their lengths. Tie all ropes into a single rope while paying as little in total as possible, and print that minimum cost.

**Input.** One line of positive integers, the rope lengths.  
**Output.** The minimum total cost.  
**Constraints.** 1 ≤ n ≤ 10^5; lengths up to 10^4  
**Example.** `4 3 2 6` → `29` (Join 2+3=5, then 4+5=9, then 6+9=15: 5+9+15=29.)  
**Example.** `10` → `0` (One rope needs no joining: 0.)  
**Hints.** Long ropes should be involved in as few joins as possible. / Always join the two shortest ropes using a min-heap.  
**Approach.** Use a min-heap. Repeatedly pop the two shortest ropes, add their sum to the cost, and push the sum back, until one rope remains. This is the Huffman-style greedy. (O(n log n) time, O(n) space)  
**Edge cases.** Single rope; Two ropes; All equal lengths

### Nearest to the origin
`dc-b-nearest-to-origin` · easy · 25 min

Delivery drones are located at integer points on a plane. Find the k drones closest to the origin (0,0) by straight-line distance. Order them by distance, breaking ties by smaller x and then smaller y.

**Input.** Line 1: k. Remaining lines: one point 'x y' per line.  
**Output.** k points written x,y separated by spaces.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5; coordinates up to 10^4 in absolute value  
**Example.** `2
1 3
-2 2
5 8
0 1` → `0,1 -2,2` (Squared distances are 10, 8, 89, 1, so the two nearest are (0,1) and (-2,2).)  
**Example.** `2
3 4
-3 -4
5 0` → `-3,-4 3,4` (All are at squared distance 25; tie-break by x gives (-3,-4) then (3,4).)  
**Hints.** You do not need the real distance, only a comparable value. / Compare squared distances; keep a max-heap of size k or sort.  
**Approach.** Compute squared distance for each point. Use a size-k max-heap (or sort) keyed by (distance, x, y) and output the k smallest in order. (O(n log k) time, O(k) space)  
**Edge cases.** k = n; Many ties; Points at the origin

### Smooth numbers
`dc-b-smooth-numbers` · easy · 25 min

A number is smooth if its only prime factors are 2, 3 and 5 (the number 1 counts as smooth). Starting with 1, 2, 3, 4, 5, 6, 8, ..., find the n-th smooth number in increasing order.

**Input.** One line with the integer n.  
**Output.** The n-th smooth number.  
**Constraints.** 1 ≤ n ≤ 1690  
**Example.** `10` → `12` (The sequence begins 1 2 3 4 5 6 8 9 10 12, so the 10th is 12.)  
**Example.** `15` → `24` (Continuing: 15 16 18 20 24, so the 15th is 24.)  
**Hints.** Every smooth number comes from a smaller smooth number times 2, 3 or 5. / Pop the smallest from a min-heap, push its multiples by 2, 3, 5 (avoid duplicates with a set).  
**Approach.** Start the heap with 1 and a visited set. Pop the smallest n-1 times, pushing x*2, x*3, x*5 when not seen. The next pop is the n-th number. (O(n log n) time, O(n) space)  
**Edge cases.** n = 1; Numbers reached by several routes (6, 10, 15); Largest n

### Valid min-heap
`dc-b-valid-min-heap` · easy · 25 min

A binary heap can be stored in an array where the children of index i sit at indices 2i+1 and 2i+2. Given an array, decide whether it is a valid min-heap: every parent must be less than or equal to each of its children.

**Input.** One line of integers.  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 3 2 7 4 5` → `true` (Each parent is no larger than its children.)  
**Example.** `1 3 2 2 4` → `false` (Index 3 holds 2, which is smaller than its parent at index 1 (value 3).)  
**Hints.** You only need to compare each node to its parent, or each parent to its children. / For i from 1 to n-1, check a[(i-1)//2] <= a[i].  
**Approach.** Loop over all indices i ≥ 1 and verify the parent at (i-1)//2 is not larger than a[i]. Any violation means the array is not a min-heap. (O(n) time, O(1) space)  
**Edge cases.** Single element; Equal values; Violation at the last index

### Build a heap by insertion
`dc-b-build-heap-by-insert` · easy · 25 min

Build a min-heap stored in an array by inserting numbers one at a time: append the new value at the end, then swap it with its parent while it is smaller than the parent (children of index i are 2i+1 and 2i+2). Print the array after all insertions.

**Input.** One line of integers in insertion order.  
**Output.** The final heap array.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `5 3 8 1` → `1 3 8 5` (After 5,3 the array is [3,5]; 8 stays; 1 swaps with 5 then with 3: 1 3 8 5.)  
**Example.** `1 2 3 4` → `1 2 3 4` (Already in heap order, so nothing moves: 1 2 3 4.)  
**Hints.** The parent of index i is (i-1)//2. / After appending, loop: while i > 0 and the parent is larger, swap and move up.  
**Approach.** For each value, append it to the array and sift it up by swapping with its parent while the parent is larger. The array after all insertions is the answer. (O(n log n) time, O(1) extra space)  
**Edge cases.** Descending input (maximum swaps); Duplicates; Single value

## intervals

### Merge the bookings
`dc-a-merge-the-bookings` · easy · 30 min

A hall has several bookings, each a closed interval [start, end] and not in any particular order. Bookings that overlap or touch (share an endpoint) should be merged into one. Print the merged bookings in increasing order, one per line.

**Input.** Line 1: n; then n lines "start end".  
**Output.** The merged intervals, one "start end" per line.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ start ≤ end ≤ 10^9  
**Example.** `3
1 4
2 6
8 9` → `1 6
8 9` ([1,4] and [2,6] merge; [8,9] is separate.)  
**Example.** `2
5 7
1 5` → `1 7` (They touch at 5, so merge.)  
**Hints.** Sort by start. / Extend the last merged interval if the next start is ≤ its end; else begin a new one.  
**Approach.** Sort intervals by start. Keep a result list; for each interval, if it starts at or before the end of the last result, extend that end with the max, otherwise append it. (O(n log n) time, O(n) space)  
**Edge cases.** one interval inside another; touching endpoints; single interval

### A day with no clashes
`dc-a-no-clash-day` · easy · 25 min

A person has meetings given as [start, end) — a meeting ending at 10 and another starting at 10 do not clash. Decide whether they can attend all of them.

**Input.** Line 1: n; then n lines "start end".  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ n ≤ 10^5; start < end ≤ 10^9  
**Example.** `3
9 10
10 11
11 12` → `true` (Back-to-back meetings are fine.)  
**Example.** `2
9 11
10 12` → `false` (10-11 lies within both.)  
**Hints.** Sort by start time. / Only neighbouring meetings can clash after sorting.  
**Approach.** Sort by start and check that every meeting starts no earlier than the previous one ends; any violation means false. (O(n log n) time, O(1) extra space)  
**Edge cases.** single meeting; identical meetings; touching meetings

### Overlapping shifts
`dc-a-overlapping-shifts` · easy · 35 min

Two employees each have a sorted list of non-overlapping closed work intervals. Print every interval during which both are working, in order, one per line, or "-" if they never overlap.

**Input.** Line 1: n; n lines; then m; m lines.  
**Output.** The intersections, one "start end" per line, or "-".  
**Constraints.** 1 ≤ n, m ≤ 10^5; values ≤ 10^9  
**Example.** `2
0 4
6 9
2
2 7
8 10` → `2 4
6 7
8 9` (Overlaps: [2,4], [6,7], [8,9].)  
**Example.** `1
1 2
1
3 4` → `-` (They never overlap.)  
**Hints.** Use one pointer in each list. / The overlap of two intervals is [max starts, min ends] if that is valid.  
**Approach.** Walk both lists with two pointers. Compute lo = max of starts and hi = min of ends; if lo ≤ hi record it. Then advance the pointer whose interval ends first. (O(n + m) time, O(1) extra space)  
**Edge cases.** touching at one point; one list inside the other; no overlap

### Total painted length
`dc-a-painted-length` · easy · 30 min

A painter paints several segments of a long wall, each a closed range [start, end] on a number line, possibly overlapping. Print the total length of wall that ends up painted at least once (a segment [a, b] has length b - a).

**Input.** Line 1: n; then n lines "start end".  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ start ≤ end ≤ 10^9  
**Example.** `3
1 4
3 6
8 10` → `7` ([1,6] has length 5 and [8,10] has 2.)  
**Example.** `1
2 2` → `0` (A single point has no length.)  
**Hints.** Overlapping parts must not be counted twice. / Merge the intervals first, then add up lengths.  
**Approach.** Sort and merge overlapping intervals, then sum end - start of each merged interval. (O(n log n) time, O(n) space)  
**Edge cases.** fully nested intervals; touching intervals; zero-length segment

### Free time finder
`dc-a-free-time-finder` · easy · 30 min

A day runs from time 0 to time T. Several busy intervals may overlap each other. Print the free intervals within [0, T] (gaps of positive length), in order, one per line, or "-" if there are none.

**Input.** Line 1: T; line 2: n; then n lines "start end".  
**Output.** Free intervals, one per line, or "-".  
**Constraints.** 1 ≤ T ≤ 10^9; 0 ≤ n ≤ 10^5; 0 ≤ start < end ≤ T  
**Example.** `10
2
2 4
6 7` → `0 2
4 6
7 10` (Gaps before, between and after the busy blocks.)  
**Example.** `5
1
0 5` → `-` (The day is fully busy.)  
**Hints.** Sort and merge busy intervals first. / Walk from time 0, recording the gap before each busy block, and finally the gap to T.  
**Approach.** Merge the busy intervals, then track a cursor starting at 0: a merged interval starting after the cursor creates a free gap; move the cursor to its end. Add a final gap if the cursor is before T. (O(n log n) time, O(n) space)  
**Edge cases.** no busy intervals; busy at start and end; overlapping busy blocks

### Not swallowed
`dc-a-not-swallowed` · easy · 30 min

You have distinct closed ranges [a, b]. A range is swallowed if another range [c, d] satisfies c ≤ a and b ≤ d. Count the ranges that are not swallowed by any other.

**Input.** Line 1: n; then n lines "start end" (all ranges distinct).  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; values fit in 32-bit  
**Example.** `3
1 4
3 6
2 8` → `2` ([3,6] sits inside [2,8]; the other two survive.)  
**Example.** `3
1 10
2 3
4 5` → `1` (Both small ranges sit inside [1,10].)  
**Hints.** Sort by start ascending, and by end descending when starts tie. / A range is swallowed if its end does not exceed the largest end seen so far.  
**Approach.** Sort by start ascending, end descending. Scan keeping the maximum end so far; a range whose end is greater than that maximum is new (count it), otherwise it is swallowed. (O(n log n) time, O(1) extra space)  
**Edge cases.** same start different ends; same end different starts; one range

## language-idioms

### C: reverse with two pointers
`dc-d-c-reverse-pointers` · easy · 25 min

In C, write void reverse(int *lo, int *hi) that reverses the elements from *lo to *hi inclusive, in place, using only pointer arithmetic and a swap through pointers (no array indexing inside the function). Read an array of n ints into a malloc'ed buffer, call your function, print the result and free the buffer.

**Input.** First line n, second line n integers.  
**Output.** The reversed array separated by spaces.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `5
1 2 3 4 5` → `5 4 3 2 1` (5 4 3 2 1)  
**Example.** `1
9` → `9` (a single element is its own reverse)  
**Hints.** Move lo forward and hi backward until they meet. / Swap with a temporary: int t = *lo; *lo = *hi; *hi = t;  
**Approach.** Loop while lo < hi: swap *lo and *hi, then lo++ and hi--. The comparison of two pointers into the same array is well defined. (O(n) time, O(1) extra space)  
**Edge cases.** n = 1; Even and odd n; Forgetting free() leaks memory

### C: a buffer that grows
`dc-d-c-grow-buffer` · easy · 30 min

In C, read integers from standard input until end of file; you do not know how many there are. Store them in a heap array that starts with capacity 4 and doubles with realloc when full. Print the sum, the maximum and the count, then free the array. Always check realloc's result.

**Input.** Whitespace-separated integers until EOF (at least one).  
**Output.** Sum, maximum and count separated by spaces.  
**Constraints.** 1 ≤ count ≤ 10^6; values fit in 32 bits, sum fits in 64 bits  
**Example.** `3 -1 8 2 5 6` → `23 8 6` (sum 23, max 8, 6 numbers)  
**Example.** `7` → `7 7 1` (single value)  
**Hints.** Keep three variables: pointer, size, capacity. When size == capacity, double capacity and realloc. / Assign realloc's result to a temporary first so you do not lose the old pointer on failure.  
**Approach.** Loop with scanf; grow the buffer geometrically (capacity *= 2) when full; accumulate sum and max; free the buffer at the end. (Amortised O(n) time, O(n) space)  
**Edge cases.** Exactly 4 numbers (no growth); 5 numbers triggers first growth; Negative values only

### C++: RAII guard order
`dc-d-cpp-raii-guards` · easy · 25 min

In C++, write a class Guard whose constructor prints 'acquire NAME' and whose destructor prints 'release NAME'. Read n names, create one Guard per name inside a single block scope (store them in a std::vector<std::unique_ptr<Guard>> built in order), and let the scope end. Releases must happen in the reverse order of acquisition; do not rely on the vector's own destruction order, instead pop the vector from the back one element at a time.

**Input.** First line n, then n names, one per line.  
**Output.** n 'acquire' lines in input order, then n 'release' lines in reverse order.  
**Constraints.** 1 ≤ n ≤ 1000  
**Example.** `2
db
file` → `acquire db
acquire file
release file
release db` (acquire db / acquire file / release file / release db)  
**Example.** `1
lock` → `acquire lock
release lock` (acquire lock / release lock)  
**Hints.** Stack-allocated locals are destroyed in reverse order of declaration; a vector's order is not something to rely on. / Call pop_back in a loop: each pop destroys the unique_ptr and so runs the destructor.  
**Approach.** Create guards in order, then pop_back until the vector is empty so destructors run last-in first-out; this mirrors what automatic scope exit does for separate local variables. (O(n) time and space)  
**Edge cases.** n = 1; Duplicate names are fine; Exceptions should still release (destructors run during unwinding)

### C++: sort with a lambda
`dc-d-cpp-lambda-sort` · easy · 20 min

In C++, read n words and sort them with std::sort and a lambda comparator: shorter words first, and words of equal length in alphabetical order. Print one word per line. Do not write a separate comparator function.

**Input.** First line n, then n words one per line.  
**Output.** The sorted words, one per line.  
**Constraints.** 1 ≤ n ≤ 10^5; words are lowercase, length ≤ 50  
**Example.** `4
pear
fig
plum
apple` → `fig
pear
plum
apple` (fig, pear, plum, apple)  
**Example.** `2
b
a` → `a
b` (a, b)  
**Hints.** The lambda takes two const std::string& and returns true if the first should come before the second. / Compare sizes first and fall back to operator< on equal sizes.  
**Approach.** std::sort(v.begin(), v.end(), [](const std::string& a, const std::string& b){ return a.size() != b.size() ? a.size() < b.size() : a < b; }); (O(n log n) comparisons)  
**Edge cases.** Equal words; All same length; Single word

### Rust: lifetimes in a helper
`dc-d-rust-longest-lifetime` · easy · 25 min

In Rust, write fn longest<'a>(a: &'a str, b: &'a str) -> &'a str that returns the longer of two string slices (the first if they have equal length). Read n lines each holding two words, call the function on borrowed slices of the input (without cloning) and print the result for each line.

**Input.** First line n, then n lines of two words.  
**Output.** For each pair, the longer word (first on ties).  
**Constraints.** 1 ≤ n ≤ 10^4; words are lowercase letters  
**Example.** `2
sun moon
ab cd` → `moon
ab` (moon, then ab (tie keeps the first))  
**Example.** `1
rust go` → `rust` (rust)  
**Hints.** The returned reference must be tied to both inputs, hence the shared lifetime 'a. / Use split_whitespace on the line and pass the two slices directly.  
**Approach.** Declare both parameters and the return type with the same lifetime 'a, compare .len() and return a when a.len() >= b.len(). (O(1) per call, O(n) input storage)  
**Edge cases.** Equal lengths; Pair of identical words; Words borrowed from a String that lives long enough

### Rust: dedup through &mut
`dc-d-rust-dedup-in-place` · easy · 30 min

In Rust, write fn dedup(words: &mut Vec<String>) that removes later duplicates in place, keeping the first occurrence of each word and the original order. Use a HashSet<String> of the words seen and Vec::retain, and call the function from main with a mutable borrow. Print the remaining words on one line.

**Input.** First line n, then n words one per line.  
**Output.** The unique words in first-seen order separated by spaces.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `5
a
b
a
c
b` → `a b c` (a b c)  
**Example.** `2
x
x` → `x` (x)  
**Hints.** retain takes a closure that runs once per element in order and keeps those returning true. / HashSet::insert returns false when the value was already present.  
**Approach.** Create a HashSet, then words.retain(|w| seen.insert(w.clone())); the closure mutates the set while retain mutates the vector. (O(n) expected time, O(n) space)  
**Edge cases.** All duplicates; No duplicates; Single element

### Rust: iterator chain
`dc-d-rust-iterator-chain` · easy · 20 min

In Rust, compute the sum of the squares of the even numbers in a list using only iterator adaptors (iter, filter, map, sum) and no for loop or mutable accumulator. Use i64 for the result.

**Input.** First line n, second line n integers.  
**Output.** The sum of squares of even values.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^6  
**Example.** `5
1 2 3 4 -6` → `56` (4 + 16 + 36 = 56)  
**Example.** `2
1 3` → `0` (no evens -> 0)  
**Hints.** filter takes a closure over &&i64 when chained on iter(); you may need to dereference. / sum needs a type annotation such as ::<i64>.  
**Approach.** nums.iter().filter(|&&x| x % 2 == 0).map(|&x| x * x).sum::<i64>(). (O(n) time, O(1) extra space)  
**Edge cases.** No even numbers; Negative evens (remainder is 0 for -6); Large squares need i64

### Rust: HashMap entry API
`dc-d-rust-entry-word-count` · easy · 25 min

In Rust, count how often each word occurs in the input using HashMap and the entry API (*map.entry(word).or_insert(0) += 1). Then collect the pairs into a Vec and sort them by count descending, ties alphabetically, and print 'word count' lines.

**Input.** Whitespace-separated lowercase words, possibly over several lines.  
**Output.** One 'word count' line per distinct word in the required order.  
**Constraints.** 1 ≤ words ≤ 10^5  
**Example.** `to be or not to be` → `be 2
to 2
not 1
or 1` (be 2 / to 2 / not 1 / or 1)  
**Example.** `x` → `x 1` (x 1)  
**Hints.** entry(key).or_insert(0) returns a mutable reference to the counter. / sort_by with then_with (or a tuple key with Reverse) handles the two-level ordering.  
**Approach.** Count with the entry API, move the map into a Vec<(String, usize)>, sort by (Reverse(count), word) and print. (O(n + k log k) time, O(k) space)  
**Edge cases.** Ties in count; Single word; Words on multiple lines

### Rust: your own Iterator
`dc-d-rust-impl-iterator` · easy · 30 min

In Rust, define struct Fib { a: u64, b: u64 } and implement the Iterator trait for it so that next() yields the Fibonacci numbers 0, 1, 1, 2, 3, ... forever. In main use take_while to print all values strictly below n on one line.

**Input.** One integer n.  
**Output.** The Fibonacci numbers smaller than n separated by spaces (empty line if none).  
**Constraints.** 0 ≤ n ≤ 10^18  
**Example.** `20` → `0 1 1 2 3 5 8 13` (0 1 1 2 3 5 8 13)  
**Example.** `1` → `0` (only 0 is below 1 -> 0)  
**Hints.** next returns Option<u64>; an infinite iterator always returns Some. / Use std::mem::replace or a tuple swap to advance the pair, mind overflow with checked_add or a limit on n.  
**Approach.** Implement Iterator with type Item = u64; next stores the current a, then advances (a, b) = (b, a + b), and returns Some(current). main chains Fib{a:0,b:1}.take_while(|&x| x < n). (O(output) time, O(1) space)  
**Edge cases.** n = 0 prints nothing; n = 1; Large n near the u64 limit

### Go: three-stage pipeline
`dc-d-go-pipeline` · easy · 30 min

In Go, build a pipeline of goroutines connected by channels: stage one generates the integers 1..n, stage two squares each number, stage three keeps only odd squares. The main goroutine prints what arrives, in order, one per line. Each stage must close its output channel when its input is exhausted.

**Input.** One integer n.  
**Output.** The odd squares among 1², 2², ..., n², one per line.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `6` → `1
9
25` (1, 9, 25)  
**Example.** `2` → `1` (1)  
**Hints.** A function that returns <-chan int and starts a goroutine inside is a neat way to build a stage. / Use defer close(out) at the top of each stage's goroutine.  
**Approach.** Write gen(n), square(in) and oddOnly(in) functions that each create an output channel, start a goroutine that ranges over the input (or loop for gen), sends results and closes the output; main ranges over the last channel. (O(n) time, O(1) buffered between stages)  
**Edge cases.** n = 1; n = 2 where only 1 passes the filter; Unclosed channel hangs main

### Python: lazy prime generator
`dc-d-py-lazy-primes` · easy · 25 min

In Python, write a generator function primes() that yields the prime numbers 2, 3, 5, 7, ... without end, remembering the primes found so far to test candidates. In main, use itertools.islice to print the first n primes on one line, without ever building a full list of the infinite sequence.

**Input.** One integer n.  
**Output.** The first n primes separated by spaces.  
**Constraints.** 1 ≤ n ≤ 5000  
**Example.** `5` → `2 3 5 7 11` (2 3 5 7 11)  
**Example.** `1` → `2` (2)  
**Hints.** A function containing yield returns a generator object; calling next() resumes it where it paused. / Test a candidate only against stored primes up to its square root.  
**Approach.** Keep a list of found primes; loop over candidates starting at 2, yield a candidate if no stored prime p with p*p <= candidate divides it, and append it. islice(primes(), n) takes the prefix. (About O(n sqrt(p_n) / log) time, O(n) space)  
**Edge cases.** n = 1; Generator must not be exhausted by earlier use; Candidate 2 is prime

### Python: dataclass inventory
`dc-d-py-dataclass-stock` · easy · 30 min

In Python, define a @dataclass Item with fields name (str), qty (int) and price (float) and a property or method value that returns qty * price. Read the items, sort them by value descending (ties by name) and print each item's name and value with two decimals, then a final TOTAL line with the combined value.

**Input.** First line n, then n lines 'name qty price'.  
**Output.** One 'name value' line per item in sorted order, then 'TOTAL value'.  
**Constraints.** 1 ≤ n ≤ 1000; qty ≤ 1000; price ≤ 1000 with at most two decimals  
**Example.** `3
bolt 100 0.25
gear 4 12.50
nut 100 0.25` → `gear 50.00
bolt 25.00
nut 25.00
TOTAL 100.00` (gear 50.00 / bolt 25.00 / nut 25.00 / TOTAL 100.00)  
**Example.** `1
cog 3 1.10` → `cog 3.30
TOTAL 3.30` (3 x 1.10 = 3.30)  
**Hints.** @dataclass generates __init__ and __repr__ for you from the annotated fields. / sorted(items, key=lambda i: (-i.value, i.name)) handles the two-level ordering.  
**Approach.** Parse each line into an Item, sort with a key of (-value, name), format with f'{v:.2f}' and accumulate the total. (O(n log n) time, O(n) space)  
**Edge cases.** Ties in value; Single item; Floating-point formatting of totals

### Python: chunking generator
`dc-d-py-chunk-generator` · easy · 25 min

In Python, write a generator chunks(iterable, k) that lazily yields successive lists of up to k items from any iterable (the last list may be shorter). Use it, with a generator expression or loop, to print the sum of each chunk of the input numbers on one line. Do not slice a pre-built list; consume the iterator.

**Input.** First line n and k, second line n integers.  
**Output.** The chunk sums separated by spaces.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ k ≤ n  
**Example.** `7 3
1 2 3 4 5 6 7` → `6 15 7` (6 15 7)  
**Example.** `2 5
4 4` → `8` (one short chunk -> 8)  
**Hints.** Use itertools.islice(it, k) on a shared iterator, or append to a buffer and yield when it reaches size k. / After the loop, yield the leftover buffer if it is not empty.  
**Approach.** Create an iterator once; repeatedly take list(islice(it, k)) and yield it until it comes back empty. (O(n) time, O(k) extra space)  
**Edge cases.** k larger than n; n a multiple of k; k = 1

### Python: context managers nest
`dc-d-py-context-nesting` · easy · 25 min

In Python, write a context manager (a class with __enter__ and __exit__, or @contextlib.contextmanager) that prints 'enter NAME' when the with block starts and 'exit NAME' when it ends. Given a list of names, enter them all as nested with-blocks (use contextlib.ExitStack) and print their enter and exit lines. Exits must run in the reverse of the entering order.

**Input.** First line n, then n lines 'open NAME'.  
**Output.** n 'enter' lines in order, then n 'exit' lines in reverse order.  
**Constraints.** 1 ≤ n ≤ 100  
**Example.** `2
open a
open b` → `enter a
enter b
exit b
exit a` (enter a / enter b / exit b / exit a)  
**Example.** `1
open z` → `enter z
exit z` (enter z / exit z)  
**Hints.** ExitStack.enter_context registers a context and returns its value; leaving the stack's with-block unwinds them last-in first-out. / The exit lines should appear even if an exception happens inside the block.  
**Approach.** with ExitStack() as stack: for each name call stack.enter_context(Ctx(name)); when the stack's block ends, __exit__ is called on each entry in reverse order. (O(n) time and space)  
**Edge cases.** Single context; Exception inside the block still exits; Order of exit lines

## linked-lists

### Reverse the chain
`dc-b-reverse-chain` · easy · 25 min

A singly linked list of integers is given by its values from head to tail. Reverse the list by re-pointing the links, and print the values of the new list from head to tail.

**Input.** One line of integers, or EMPTY.  
**Output.** The reversed list, or EMPTY.  
**Constraints.** 0 ≤ n ≤ 10^5  
**Example.** `1 2 3 4` → `4 3 2 1` (Reading the chain backwards gives 4 3 2 1.)  
**Example.** `EMPTY` → `EMPTY` (An empty list stays empty.)  
**Hints.** Walk once, remembering where you came from. / Keep prev, cur and next pointers; set cur.next = prev, then advance all three.  
**Approach.** Iterate with three pointers: save next, point current's link backwards to prev, then move prev and current forward. The final prev is the new head. (O(n) time, O(1) extra space)  
**Edge cases.** Empty list; Single node; Two nodes

### Middle onward
`dc-b-middle-onward` · easy · 25 min

Given a singly linked list, find its middle node and print the list from that node to the tail. If there are two middle nodes, use the second one. Try to do it in a single pass over the list.

**Input.** One line of integers (at least one).  
**Output.** Values from the middle node to the end.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 2 3 4 5` → `3 4 5` (The middle node holds 3, so print 3 4 5.)  
**Example.** `1 2 3 4` → `3 4` (Two middles; take the second one: 3 4.)  
**Hints.** Could two walkers moving at different speeds meet your goal? / Move slow one step and fast two steps; when fast runs off the end, slow is at the middle.  
**Approach.** Use slow and fast pointers starting at the head. Advance fast by two and slow by one while fast and fast.next exist. Slow ends on the second middle. (O(n) time, O(1) extra space)  
**Edge cases.** Single node; Two nodes; Odd versus even length

### Loop detector
`dc-b-loop-detector` · easy · 25 min

A linked list's last node may point back to an earlier node, forming a loop. You are told the node values and the 0-based index that the tail links back to (-1 means it ends normally). Decide whether the list contains a loop, using an approach that would work without being told the index.

**Input.** Line 1: the node values. Line 2: the index the tail links to, or -1.  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `3 2 0 -4
1` → `true` (The tail links back to the node at index 1, so there is a loop.)  
**Example.** `7 8
-1` → `false` (The tail ends normally.)  
**Hints.** If you walk forever, what does that say about the list? / Use a slow pointer (1 step) and a fast pointer (2 steps); they meet iff there is a loop.  
**Approach.** Run Floyd's tortoise and hare: slow moves one node, fast moves two. If fast reaches null there is no loop; if they ever point to the same node, there is a loop. (O(n) time, O(1) extra space)  
**Edge cases.** Single node pointing to itself; No loop; Loop back to the head

### Zip two sorted chains
`dc-b-zip-sorted-chains` · easy · 25 min

Two linked lists are each sorted in non-decreasing order. Merge them into one sorted list by relinking nodes, and print the values of the merged list.

**Input.** Two lines, each a sorted list of integers or EMPTY.  
**Output.** The merged sorted list, or EMPTY.  
**Constraints.** 0 ≤ n, m ≤ 10^5  
**Example.** `1 4 9
2 3 10` → `1 2 3 4 9 10` (Taking the smaller head each time gives 1 2 3 4 9 10.)  
**Example.** `EMPTY
5 6` → `5 6` (With one list empty the other is the answer.)  
**Hints.** Compare the two current heads. / Use a dummy head node and append the smaller head each step; attach the leftover list at the end.  
**Approach.** Create a dummy node and a tail pointer. While both lists have nodes, link the smaller one and advance it. Append whichever list remains and return dummy.next. (O(n+m) time, O(1) extra space)  
**Edge cases.** Both empty; Equal values across lists; One list much longer

### Drop the nth from the end
`dc-b-drop-nth-from-end` · easy · 25 min

Remove the n-th node counted from the tail of a linked list (the last node is n=1) and print the resulting list. Aim for a single pass over the list.

**Input.** Line 1: the list. Line 2: n.  
**Output.** The list after removal, or EMPTY.  
**Constraints.** 1 ≤ n ≤ length ≤ 10^5  
**Example.** `1 2 3 4 5
2` → `1 2 3 5` (The second from the end is 4; removing it leaves 1 2 3 5.)  
**Example.** `9
1` → `EMPTY` (Removing the only node leaves EMPTY.)  
**Hints.** You do not know the length in advance, but two pointers can keep a fixed gap. / Move a lead pointer n steps ahead, then move both until lead hits the end; the trailing pointer is just before the target (use a dummy head).  
**Approach.** Put a dummy node before the head. Advance a lead pointer n steps, then move lead and trail together until lead is at the last node. Trail.next is the node to remove. (O(n) time, O(1) extra space)  
**Edge cases.** Remove the head; Remove the tail; Single node

### Dedupe a sorted chain
`dc-b-dedupe-sorted-chain` · easy · 25 min

In a sorted singly linked list some values appear several times. Remove the extra copies so each value appears once, keeping the first occurrence, and print the result.

**Input.** One line of non-decreasing integers, or EMPTY.  
**Output.** The deduplicated list.  
**Constraints.** 0 ≤ n ≤ 10^5  
**Example.** `1 1 2 3 3 3` → `1 2 3` (Each value is kept once: 1 2 3.)  
**Example.** `4 4 4` → `4` (All copies collapse into one node: 4.)  
**Hints.** Duplicates are always next to each other. / If cur.val == cur.next.val, skip the next node; otherwise advance.  
**Approach.** Walk with one pointer. While the next node has the same value, bypass it by relinking cur.next to cur.next.next; otherwise move on. (O(n) time, O(1) extra space)  
**Edge cases.** Empty list; All equal; No duplicates

### Mirror chain
`dc-b-mirror-chain` · easy · 25 min

Decide whether the values of a singly linked list read the same from head to tail as from tail to head. Try to avoid using O(n) extra memory.

**Input.** One line of integers (at least one).  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 2 3 2 1` → `true` (The list equals its reverse.)  
**Example.** `1 2 2 3` → `false` (1 does not match 3.)  
**Hints.** Copying to an array works but costs memory. / Find the middle, reverse the second half in place, then compare the halves node by node.  
**Approach.** Use slow/fast pointers to find the middle, reverse the second half in place, and compare it with the first half. Optionally restore the list afterwards. (O(n) time, O(1) extra space)  
**Edge cases.** Single node; Two equal nodes; Even length non-palindrome

### Odd-even regroup
`dc-b-odd-even-regroup` · easy · 25 min

Regroup a linked list so all nodes in odd positions (1st, 3rd, ...) come first, followed by all nodes in even positions, keeping the original relative order inside each group. Positions refer to node order, not values.

**Input.** One line of integers, or EMPTY.  
**Output.** The regrouped list.  
**Constraints.** 0 ≤ n ≤ 10^5  
**Example.** `1 2 3 4 5` → `1 3 5 2 4` (Positions 1,3,5 hold 1 3 5; positions 2,4 hold 2 4.)  
**Example.** `10 20 30 40` → `10 30 20 40` (Odd positions: 10 30; even positions: 20 40.)  
**Hints.** Build two chains as you walk. / Keep odd and even tails; alternately append nodes, then link the odd chain's tail to the even chain's head.  
**Approach.** Walk the list, relinking alternate nodes to an odd chain and an even chain. At the end connect the odd tail to the even head. (O(n) time, O(1) extra space)  
**Edge cases.** Empty list; Single node; Even and odd lengths

## math

### Digital root of a giant
`dc-d-digit-root-giant` · easy · 20 min

Keep replacing a number with the sum of its decimal digits until a single digit remains; that digit is its digital root. The number may have up to 100000 digits, so it arrives as text. Find the result without simulating the repeated sums.

**Input.** One line with a non-negative decimal number, no leading zeros except for 0 itself.  
**Output.** The digital root.  
**Constraints.** 1 to 100000 digits  
**Example.** `9875` → `2` (9+8+7+5=29, 2+9=11, 1+1=2)  
**Example.** `99` → `9` (18 then 9)  
**Hints.** Compare a number with its digit sum modulo 9. / Zero is special; multiples of 9 map to 9.  
**Approach.** A number is congruent to its digit sum mod 9, so the root is 0 for 0, else 1 + (n - 1) mod 9. Compute n mod 9 by summing digits of the string. (O(d) time for d digits, O(1) space)  
**Edge cases.** Input 0; Multiple of 9; Very long input

### Zeros at the end of n!
`dc-d-factorial-tail-zeros` · easy · 20 min

The factorial n! = 1·2·...·n gets very long. Count how many zeros appear at the end of its decimal representation, without computing the factorial.

**Input.** One integer n.  
**Output.** The number of trailing zeros of n!.  
**Constraints.** 0 ≤ n ≤ 10^18  
**Example.** `25` → `6` (floor(25/5)+floor(25/25)=5+1=6)  
**Example.** `4` → `0` (no multiple of 5 yet -> 0)  
**Hints.** A trailing zero comes from a factor pair 2·5; factors of 2 are plentiful. / Count factors of 5, including those hidden in 25, 125, ...  
**Approach.** Sum floor(n/5) + floor(n/25) + floor(n/125) + ... until the term is zero. (O(log n) time, O(1) space)  
**Edge cases.** n = 0 or 1; n = 5^k; n = 10^18

### Vault code power
`dc-d-vault-power` · easy · 20 min

A vault code is a^b taken modulo m, where b can be astronomically large. Implement fast modular exponentiation (square-and-multiply) and print the code.

**Input.** Three integers a, b, m on one line.  
**Output.** a^b mod m.  
**Constraints.** 0 ≤ a < 10^9; 0 ≤ b ≤ 10^18; 1 ≤ m ≤ 10^9  
**Example.** `2 10 1000` → `24` (1024 mod 1000 = 24)  
**Example.** `5 0 7` → `1` (anything to the power 0 is 1)  
**Hints.** Use the binary expansion of b: square the base each step and multiply into the result when the bit is 1. / Reduce modulo m after every multiplication; beware m = 1.  
**Approach.** Iterate over the bits of b, maintaining base = base^2 mod m and multiplying result by base when the bit is set. Start with result = 1 mod m. (O(log b) time, O(1) space)  
**Edge cases.** b = 0; m = 1 gives 0; a = 0

### Two square tiles
`dc-d-two-square-tiles` · easy · 25 min

A tiler has two square tiles with whole-number side lengths a and b (a, b ≥ 0). Can the total area a² + b² equal exactly n? Answer YES or NO.

**Input.** One integer n.  
**Output.** YES or NO.  
**Constraints.** 0 ≤ n ≤ 10^12  
**Example.** `25` → `YES` (25 = 3² + 4² = 0² + 5²)  
**Example.** `21` → `NO` (no pair of squares sums to 21)  
**Hints.** Loop a from 0 while a² ≤ n/2 and test whether n - a² is a perfect square. / Use integer square roots to avoid floating-point errors for large n.  
**Approach.** Iterate a up to sqrt(n/2) and check whether n - a² is a perfect square using an integer square root. (O(sqrt n) time, O(1) space)  
**Edge cases.** n = 0; n = 1; n a perfect square

### One row of Pascal
`dc-d-pascal-row` · easy · 20 min

Pascal's triangle begins with row 0 = [1], row 1 = [1, 1], row 2 = [1, 2, 1], where every inner entry is the sum of the two entries above it. Print row k without building all earlier rows from scratch if you can.

**Input.** One integer k.  
**Output.** Row k, entries separated by spaces.  
**Constraints.** 0 ≤ k ≤ 30  
**Example.** `4` → `1 4 6 4 1` (1 4 6 4 1)  
**Example.** `0` → `1` (the top of the triangle)  
**Hints.** Entry i of row k is C(k, i). / C(k, i+1) = C(k, i) * (k - i) / (i + 1), always an exact integer.  
**Approach.** Start with 1 and update each next entry by multiplying by (k - i) and dividing by (i + 1) with integer arithmetic. (O(k) time, O(k) output)  
**Edge cases.** k = 0; k = 1; k = 30 stays within 64-bit

### Does the chain reach one
`dc-d-happy-chain` · easy · 25 min

Start with a positive integer and repeatedly replace it by the sum of the squares of its digits. If the process ever reaches 1 the number is called cheerful; otherwise it loops forever. Decide whether n is cheerful.

**Input.** One integer n.  
**Output.** YES if the process reaches 1, otherwise NO.  
**Constraints.** 1 ≤ n ≤ 10^9  
**Example.** `19` → `YES` (19 -> 82 -> 68 -> 100 -> 1)  
**Example.** `4` → `NO` (4 -> 16 -> 37 -> 58 -> 89 -> 145 -> 42 -> 20 -> 4, a loop)  
**Hints.** The numbers never grow large after the first step, so a loop must repeat a value. / Remember values you have seen, or use Floyd's cycle detection.  
**Approach.** Iterate the digit-square-sum map, storing seen values in a set; stop at 1 (YES) or on a repeat (NO). (O(log n) time per step, a small number of steps)  
**Edge cases.** n = 1; Numbers that enter the 4-cycle; Large n with many 9s

### Hailstone champion
`dc-d-hailstone-champion` · easy · 30 min

From a start value, repeat: if the number is even halve it, otherwise triple it and add one, until it reaches 1. The number of steps is the start's flight length. Among all starts from 1 to n-1, find the one with the longest flight (smallest start on ties) and report it with its length.

**Input.** One integer n.  
**Output.** Two integers: the start value and its step count.  
**Constraints.** 2 ≤ n ≤ 10^5  
**Example.** `10` → `9 19` (start 9 takes 19 steps)  
**Example.** `3` → `2 1` (start 2 takes 1 step, start 1 takes 0)  
**Hints.** Intermediate values can exceed 32 bits for larger n; use 64-bit integers. / Cache flight lengths of values you have already computed to avoid repeating work.  
**Approach.** Compute the length for each start with memoization on values below n, taking the maximum with a strict comparison so the smallest start wins ties. (O(n * average path) time, O(n) space)  
**Edge cases.** n = 2; Ties; Overflow in 32-bit

### Divisible by either
`dc-d-either-multiple` · easy · 20 min

How many integers between 1 and n inclusive are divisible by a, by b, or by both? Remember not to count the numbers divisible by both twice.

**Input.** Three integers n, a, b on one line.  
**Output.** The count.  
**Constraints.** 1 ≤ n ≤ 10^18; 1 ≤ a, b ≤ 10^9  
**Example.** `20 3 5` → `9` (multiples of 3: 6, of 5: 4, of 15: 1 -> 9)  
**Example.** `10 2 4` → `5` (every multiple of 4 is already a multiple of 2 -> 5)  
**Hints.** Count multiples of a, add multiples of b, subtract multiples of lcm(a, b). / lcm(a,b) = a / gcd(a,b) * b.  
**Approach.** Inclusion-exclusion: floor(n/a) + floor(n/b) - floor(n/lcm(a,b)). (O(log min(a,b)) time, O(1) space)  
**Edge cases.** a = b; a = 1; lcm larger than n

### Print in any base
`dc-d-any-base-print` · easy · 20 min

Convert a non-negative integer to a given base from 2 to 16 using digits 0-9 and uppercase A-F. Do it by hand with repeated division rather than a built-in formatter.

**Input.** Two integers n and b on one line.  
**Output.** The representation of n in base b.  
**Constraints.** 0 ≤ n ≤ 10^18; 2 ≤ b ≤ 16  
**Example.** `255 16` → `FF` (FF)  
**Example.** `10 2` → `1010` (1010)  
**Hints.** The remainder of n divided by b is the last digit. / Collect digits in reverse and flip them at the end.  
**Approach.** While n > 0, take n mod b as the next digit and divide n by b; reverse the collected digits. Special-case 0. (O(log_b n) time and space)  
**Edge cases.** n = 0; b = 2 with large n; b = 16 with letters

## matrices

### Flip rows and columns
`dc-b-flip-rows-and-columns` · easy · 25 min

Transpose a rectangular matrix: the element in row i, column j of the input moves to row j, column i of the output. A matrix with r rows and c columns becomes one with c rows and r columns.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** The transposed matrix, one row per line.  
**Constraints.** 1 ≤ r, c ≤ 500  
**Example.** `1 2 3
4 5 6` → `1 4
2 5
3 6` (The two rows become two columns of a 3x2 matrix.)  
**Example.** `7 8
9 10` → `7 9
8 10` (A square matrix reflects across its main diagonal.)  
**Hints.** The output shape is the input shape swapped. / Create an empty c x r matrix and set out[j][i] = in[i][j].  
**Approach.** Allocate a c-by-r result and copy each element a[i][j] into result[j][i]. In-place transposition is only possible for square matrices. (O(r*c) time and space)  
**Edge cases.** Single row; Single column; 1x1

### Quarter turn
`dc-b-quarter-turn` · easy · 25 min

Rotate a rectangular matrix 90 degrees clockwise and print the result. The top row of the input becomes the rightmost column of the output.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** The rotated matrix, one row per line.  
**Constraints.** 1 ≤ r, c ≤ 500  
**Example.** `1 2
3 4` → `3 1
4 2` (The left column read bottom-up becomes the top row: 3 1 / 4 2.)  
**Example.** `1 2 3
4 5 6` → `4 1
5 2
6 3` (A 2x3 matrix becomes 3x2: 4 1 / 5 2 / 6 3.)  
**Hints.** Rotating clockwise equals transposing and then reversing each row. / Or use out[j][r-1-i] = in[i][j].  
**Approach.** Transpose the matrix and reverse every row of the transpose; equivalently map a[i][j] to result[j][r-1-i]. (O(r*c) time and space)  
**Edge cases.** Single row; Single column; Square matrix

### Spiral walk
`dc-b-spiral-walk` · easy · 25 min

Start at the top-left cell of a matrix and walk clockwise around it in a spiral - right along the top, down the right side, left along the bottom, up the left side - then continue inwards. Print the values in the order you visit them.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** All values in spiral order on one line.  
**Constraints.** 1 ≤ r, c ≤ 200  
**Example.** `1 2
3 4
5 6` → `1 2 4 6 5 3` (Right: 1 2; down: 4 6; left: 5; up: 3. Order 1 2 4 6 5 3.)  
**Example.** `7 8 9 10` → `7 8 9 10` (A single row is read left to right.)  
**Hints.** Track four boundaries: top, bottom, left, right. / Walk one side at a time, shrinking the matching boundary after each side, and stop when boundaries cross.  
**Approach.** Maintain top, bottom, left and right indices. Traverse the top row, right column, bottom row (if rows remain) and left column (if columns remain), moving each boundary inwards after its pass. (O(r*c) time, O(1) extra space besides output)  
**Edge cases.** Single row; Single column; Odd square

### Diagonal total
`dc-b-diagonal-total` · easy · 25 min

For a square matrix, add up the numbers on both diagonals. The centre cell of an odd-sized matrix lies on both, so count it only once.

**Input.** A square matrix, each line a row.  
**Output.** The diagonal sum.  
**Constraints.** 1 ≤ n ≤ 500  
**Example.** `1 2 3
4 5 6
7 8 9` → `25` (Diagonals give 1+5+9 and 3+7 with the centre counted once: 25.)  
**Example.** `5 1
2 4` → `12` (Main diagonal 5+4, anti-diagonal 1+2: 12.)  
**Hints.** Indices on the main diagonal satisfy i == j; on the anti-diagonal i + j == n-1. / Sum a[i][i] + a[i][n-1-i] for each row, then subtract the centre if n is odd.  
**Approach.** Loop over rows adding the main and anti-diagonal entries. If n is odd the middle cell was added twice, so subtract it once. (O(n) time, O(1) space)  
**Edge cases.** 1x1 matrix; Even size; Negative values

### Cross out zeros
`dc-b-cross-out-zeros` · easy · 25 min

Whenever a matrix cell holds 0, every cell in its row and its column must become 0. Zeros created by this rule must not trigger further changes - decide using the original matrix only. Print the resulting matrix.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** The updated matrix, one row per line.  
**Constraints.** 1 ≤ r, c ≤ 200  
**Example.** `1 2 3
4 0 6
7 8 9` → `1 0 3
0 0 0
7 0 9` (The zero at the centre clears its row and column.)  
**Example.** `0 1
2 3` → `0 0
0 3` (The zero in the corner clears the first row and first column.)  
**Hints.** Record first, modify later. / Collect the set of rows and columns containing a zero, then zero them in a second pass.  
**Approach.** First pass: note every row and column index that contains a zero. Second pass: set a cell to 0 if its row or column is marked. (Marker rows and columns inside the matrix give O(1) extra space.) (O(r*c) time, O(r+c) space)  
**Edge cases.** No zeros; All zeros; Zero in a corner

### Matrix product
`dc-b-matrix-product` · easy · 25 min

Multiply an r x k matrix A by a k x c matrix B. Entry (i, j) of the product is the sum over t of A[i][t] * B[t][j]. The two matrices are separated by a line containing three dashes.

**Input.** Matrix A, a line '---', then matrix B.  
**Output.** The r x c product, one row per line.  
**Constraints.** 1 ≤ r, k, c ≤ 100; products fit in 64-bit  
**Example.** `1 2
3 4
---
5 6
7 8` → `19 22
43 50` (Row 1: 1*5+2*7=19 and 1*6+2*8=22; row 2: 43 and 50.)  
**Example.** `1 2 3
---
1
1
1` → `6` (A 1x3 times a 3x1 gives the single number 6.)  
**Hints.** Each output cell is a dot product of a row of A with a column of B. / Use three nested loops over i, j, t.  
**Approach.** For every cell (i, j) of the result, sum A[i][t]*B[t][j] over t. Three nested loops cover everything. (O(r*k*c) time, O(r*c) space)  
**Edge cases.** 1x1 matrices; Row times column (scalar result); Column times row (matrix result)

### Constant diagonals
`dc-b-constant-diagonals` · easy · 25 min

A matrix is called diagonal-constant if every diagonal running from top-left to bottom-right holds one repeated value. Decide whether the given matrix has this property.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** true or false.  
**Constraints.** 1 ≤ r, c ≤ 300  
**Example.** `1 2 3
4 1 2
5 4 1` → `true` (Each top-left to bottom-right diagonal is constant.)  
**Example.** `1 2
2 2` → `false` (The main diagonal holds 1 and 2.)  
**Hints.** Two cells share a diagonal if one is the other's up-left neighbour. / Check that a[i][j] == a[i-1][j-1] for all i, j ≥ 1.  
**Approach.** Compare each cell with its up-left neighbour; if any pair differs the property fails. All other cells are covered by the chain of neighbours. (O(r*c) time, O(1) space)  
**Edge cases.** Single row; Single column; One bad cell at the bottom right

### Saddle values
`dc-b-saddle-values` · easy · 25 min

A saddle value is a number that is the smallest in its row and, at the same time, the largest in its column. All numbers in the matrix are distinct. Print every saddle value in increasing order, or none if there are none.

**Input.** One matrix: each line is a row of space-separated integers.  
**Output.** Saddle values separated by spaces, or none.  
**Constraints.** 1 ≤ r, c ≤ 200; values distinct  
**Example.** `5 9 4
6 8 7
2 3 1` → `6` (Only 6 is the minimum of its row and the maximum of its column.)  
**Example.** `1 10
9 2` → `none` (Row minima 1 and 2 are not column maxima: none.)  
**Hints.** Find each row's minimum first. / Precompute column maxima; compare each row minimum against the maximum of its column.  
**Approach.** Compute the minimum of every row and the maximum of every column. A row minimum whose value equals the maximum of its column is a saddle value. (O(r*c) time, O(r+c) space)  
**Edge cases.** Single cell; Single row; No saddle value

## number-theory

### Gears: common factor and meeting point
`dc-d-gear-teeth-gcd-lcm` · easy · 20 min

A machine has n gears with given tooth counts meshed in a chain of rotations. Find the greatest common divisor of all tooth counts and the least common multiple, which tells after how many teeth-steps all gears return to their start together.

**Input.** First line n, second line n positive integers.  
**Output.** The GCD and the LCM separated by a space.  
**Constraints.** 1 ≤ n ≤ 20; 1 ≤ value ≤ 1000; the LCM fits in 64 bits  
**Example.** `3
12 18 30` → `6 180` (gcd 6, lcm 180)  
**Example.** `2
7 5` → `1 35` (coprime: gcd 1, lcm 35)  
**Hints.** gcd(a, b, c) = gcd(gcd(a, b), c). / lcm(a, b) = a / gcd(a, b) * b; divide first to avoid overflow.  
**Approach.** Fold gcd and lcm across the list using the Euclidean algorithm. (O(n log max) time, O(1) space)  
**Edge cases.** n = 1; Values equal; Coprime values

### Prime census
`dc-d-sieve-census` · easy · 25 min

A town numbers its houses 1 to n, and only houses with a prime number get a mailbox. Count the mailboxes using the sieve of Eratosthenes.

**Input.** One integer n.  
**Output.** The count of primes not exceeding n.  
**Constraints.** 1 ≤ n ≤ 5·10^6  
**Example.** `30` → `10` (primes: 2 3 5 7 11 13 17 19 23 29 -> 10)  
**Example.** `1` → `0` (1 is not prime)  
**Hints.** Cross out multiples of each prime starting from its square. / You only need to sieve with primes up to sqrt(n).  
**Approach.** Run the sieve of Eratosthenes with a boolean array and count the surviving indices ≥ 2. (O(n log log n) time, O(n) space)  
**Edge cases.** n = 1; n = 2; n a prime

### Prime recipe
`dc-d-prime-recipe` · easy · 25 min

Write a number as a product of primes in increasing order, using ^ for repeated primes and ' * ' between factors, e.g. 360 = 2^3 * 3^2 * 5. For 1 print 1.

**Input.** One integer n.  
**Output.** The factorization string.  
**Constraints.** 1 ≤ n ≤ 10^12  
**Example.** `360` → `2^3 * 3^2 * 5` (2^3 * 3^2 * 5)  
**Example.** `97` → `97` (a prime stays as itself)  
**Hints.** Trial-divide by candidates p while p*p ≤ n. / Whatever remains above 1 after the loop is a prime factor.  
**Approach.** Divide out each p from 2 upward while p² ≤ n counting exponents; append any leftover n > 1 as a prime. (O(sqrt n) time, O(1) space)  
**Edge cases.** n = 1; n prime; n a prime square near 10^12

### How many divisors
`dc-d-divisor-headcount` · easy · 25 min

A teacher wants to split a class of n students into equal groups. Count how many group sizes (divisors of n, including 1 and n) are possible.

**Input.** One integer n.  
**Output.** The number of positive divisors of n.  
**Constraints.** 1 ≤ n ≤ 10^12  
**Example.** `36` → `9` (1,2,3,4,6,9,12,18,36 -> 9)  
**Example.** `13` → `2` (only 1 and 13)  
**Hints.** Divisors come in pairs (d, n/d); you only need to scan up to sqrt(n). / Or use the exponent form: multiply (e+1) over the prime factorization.  
**Approach.** Factorize n and multiply (exponent + 1) for each prime, or scan d up to sqrt(n) counting pairs. (O(sqrt n) time, O(1) space)  
**Edge cases.** n = 1; Perfect square; Large prime

### Smallest Goldbach split
`dc-d-goldbach-pair` · easy · 25 min

Every even number above 2 is believed to be the sum of two primes. For a given even n, find the pair p ≤ q of primes with p + q = n and the smallest p.

**Input.** One even integer n.  
**Output.** p and q separated by a space.  
**Constraints.** 4 ≤ n ≤ 10^6, n even  
**Example.** `28` → `5 23` (5 + 23 = 28, 28 - 2 = 26 and 28 - 3 = 25 are not prime)  
**Example.** `4` → `2 2` (2 + 2)  
**Hints.** Test primality with a sieve up to n. / Scan p upward and stop at the first p with both p and n - p prime.  
**Approach.** Sieve primes up to n, then scan p from 2 until sieve[p] and sieve[n-p] are both true. (O(n log log n) time, O(n) space)  
**Edge cases.** n = 4; n = 6; Largest n

### Abundant numbers
`dc-d-abundant-count` · easy · 25 min

A number is abundant if the sum of its proper divisors (divisors smaller than itself) is larger than the number. 12 is abundant since 1+2+3+4+6 = 16. Count abundant numbers from 1 to n.

**Input.** One integer n.  
**Output.** How many integers in [1, n] are abundant.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `20` → `3` (12, 18, 20 -> 3)  
**Example.** `11` → `0` (none yet -> 0)  
**Hints.** Instead of factoring each number, add every d to all of its multiples. / A sieve-like loop over d and multiples runs in O(n log n).  
**Approach.** For each d from 1 to n/2, add d to the divisor sum of every multiple 2d, 3d, ...; then count indices whose sum exceeds the index. (O(n log n) time, O(n) space)  
**Edge cases.** n = 1; n = 12 first abundant; Perfect numbers like 6 are not abundant

### Whole-number right triangles
`dc-d-right-triangles-count` · easy · 30 min

Count triples of positive integers (a, b, c) with a ≤ b, a² + b² = c² and c ≤ n. Each side must be a whole number, e.g. (3, 4, 5).

**Input.** One integer n.  
**Output.** The number of such triples.  
**Constraints.** 1 ≤ n ≤ 2000  
**Example.** `13` → `3` ((3,4,5), (6,8,10), (5,12,13) -> 3)  
**Example.** `4` → `0` (no triangle fits)  
**Hints.** Try all a ≤ b with b < n and test whether a² + b² is a perfect square no greater than n². / An integer square root avoids float errors.  
**Approach.** Brute force over pairs (a, b) with an integer square-root check is fast enough; alternatively generate primitive triples with Euclid's formula and scale them. (O(n²) time, O(1) space)  
**Edge cases.** n < 5; n = 5; Scaled triples count separately

### Pairs that add up evenly
`dc-d-pair-remainders` · easy · 30 min

Count pairs of positions i < j in an array whose values add up to a multiple of k. Group values by their remainder mod k instead of checking every pair.

**Input.** First line n and k, second line n integers.  
**Output.** The number of pairs.  
**Constraints.** 1 ≤ n ≤ 2·10^5; 1 ≤ k ≤ 10^9; 0 ≤ values ≤ 10^9  
**Example.** `5 3
1 2 4 5 3` → `4` ((1,2),(1,5),(4,2),(4,5) sum to multiples of 3 -> 4)  
**Example.** `3 4
2 2 2` → `3` (three pairs sum to 4 -> 3)  
**Hints.** Two numbers with remainders r and (k - r) mod k combine to a multiple of k. / Remainders 0 (and k/2 when k is even) pair among themselves.  
**Approach.** Count values per remainder. For r < k - r multiply counts of r and k - r; for r = 0 and r = k/2 add c·(c-1)/2. (O(n) time, O(min(n,k)) space)  
**Edge cases.** k = 1 (all pairs); Remainder k/2; All zeros

### Twin lanterns
`dc-d-twin-lanterns` · easy · 25 min

Two primes that differ by exactly 2 (like 11 and 13) are twin primes. Count the twin pairs (p, p+2) where both numbers are at most n.

**Input.** One integer n.  
**Output.** The number of twin prime pairs with p + 2 ≤ n.  
**Constraints.** 1 ≤ n ≤ 10^6  
**Example.** `20` → `4` ((3,5), (5,7), (11,13), (17,19) -> 4)  
**Example.** `4` → `0` (no pair fits)  
**Hints.** Sieve once up to n. / Then count p where both sieve[p] and sieve[p+2] are prime.  
**Approach.** Build a sieve up to n and count indices p with p and p + 2 both prime and p + 2 ≤ n. (O(n log log n) time, O(n) space)  
**Edge cases.** n < 5; n = 5 gives (3,5); Largest n

## parsing

### Chop an expression into tokens
`dc-d-expression-tokens` · easy · 20 min

Write a tokenizer for arithmetic text. Tokens are non-negative integers and the single characters + - * / ( ). Spaces may appear anywhere between tokens but never inside a number. Output the tokens in order, separated by one space.

**Input.** One line containing digits, the operators + - * / ( ) and spaces.  
**Output.** The tokens separated by single spaces.  
**Constraints.** 1 ≤ length ≤ 10^4; input is well-formed  
**Example.** `12+ 7*(3 -4)` → `12 + 7 * ( 3 - 4 )` (12 + 7 * ( 3 - 4 ))  
**Example.** `  100  ` → `100` (100)  
**Hints.** Scan with an index: skip spaces; if the character is a digit, consume all following digits. / Every other non-space character is a token by itself.  
**Approach.** Single left-to-right scan: gather maximal digit runs into number tokens, emit operator characters individually, skip whitespace. (O(n) time, O(n) output)  
**Edge cases.** Multi-digit numbers; No spaces at all; Only a number

### Calculator without brackets
`dc-d-flat-calculator` · easy · 30 min

Evaluate an expression made of non-negative integers and the operators + - * /, with usual precedence (multiplication and division before addition and subtraction, left to right) and integer division that rounds towards zero. There are no brackets and no negative literals.

**Input.** One line with the expression, spaces allowed.  
**Output.** The integer result.  
**Constraints.** Length ≤ 10^4; no division by zero; intermediate values fit in 64 bits  
**Example.** `2 + 3 * 4 - 8 / 3` → `12` (2 + 12 - 2 = 12)  
**Example.** `100 / 7 / 2` → `7` (14 / 2 = 7)  
**Hints.** Keep a running total and the current product/quotient term. / When you see + or -, finish the current term and add it to the total with its sign.  
**Approach.** Scan tokens: keep a 'term' that multiplies or divides as you go, and flush it into the total when a + or - arrives (using the sign of the previous such operator). (O(n) time, O(1) extra space)  
**Edge cases.** Single number; Division truncation; Long chains of the same operator

### Pack runs of letters
`dc-d-run-length-pack` · easy · 20 min

Compress a string by replacing every maximal run of equal characters with its length followed by the character, so aaabcc becomes 3a1b2c. Letters only; always write the count, even when it is 1.

**Input.** One lowercase string.  
**Output.** The run-length encoded string.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `aaabcc` → `3a1b2c` (3a1b2c)  
**Example.** `zzzzzzzzzzzz` → `12z` (twelve z's -> 12z)  
**Hints.** Walk with two indices: start of the run and a scanner that advances while characters match. / Emit the length (which can have several digits) then the character.  
**Approach.** Scan the string, extending each run, and append count + character to the output. (O(n) time, O(n) output)  
**Edge cases.** Single character; Run of length ≥ 10; All distinct characters

### Unpack run-length text
`dc-d-run-length-unpack` · easy · 25 min

Decode a string made of pairs (count, letter) such as 3a1b2c back to aaabcc. The count can have several digits and is at least 1.

**Input.** One encoded string.  
**Output.** The decoded string.  
**Constraints.** The decoded length is at most 10^6  
**Example.** `3a1b2c` → `aaabcc` (aaabcc)  
**Example.** `11x` → `xxxxxxxxxxx` (eleven x's)  
**Hints.** Read digits until you hit a letter; that number is the repeat count. / Append the letter that many times and continue after it.  
**Approach.** Parse the number greedily over consecutive digits, then repeat the next letter that many times. (O(output length) time, O(output) space)  
**Edge cases.** Multi-digit counts; Count 1; Single group

### Decode a form string
`dc-d-form-string-decode` · easy · 30 min

Web forms send data as name=value pairs joined by &, where a space is written as + and any byte can be written as %XX with two hex digits (ASCII only here). Decode the string and print each pair on its own line as name=value. A pair with no = has an empty value.

**Input.** One line with the encoded form string.  
**Output.** One decoded name=value pair per line, in order.  
**Constraints.** Length ≤ 10^5; escapes are valid and encode ASCII  
**Example.** `city=New+York&tag=a%26b&flag` → `city=New York
tag=a&b
flag=` (city=New York / tag=a&b / flag=)  
**Example.** `q=1%2B1%3D2` → `q=1+1=2` (q=1+1=2)  
**Hints.** Split on & first, then on the first = in each pair, and only then decode each half. / Decoding: + becomes a space, %XX becomes the character with that hex code.  
**Approach.** Split into pairs on &, split each at the first =, and decode each part with a scan converting + to space and %XX to the corresponding character. (O(n) time, O(n) space)  
**Edge cases.** Pair without =; Encoded & and = inside values; Empty input segments

### Duration to seconds
`dc-d-duration-to-seconds` · easy · 20 min

A duration is written as a sequence of number+unit parts such as 1d2h30m5s, where units are d (86400 seconds), h (3600), m (60) and s (1). Units may appear in any order and each at most once. Convert it to total seconds.

**Input.** One duration string.  
**Output.** Total seconds.  
**Constraints.** Length ≤ 100; each number ≤ 10^6  
**Example.** `1h30m15s` → `5415` (3600 + 1800 + 15 = 5415)  
**Example.** `45s` → `45` (just seconds)  
**Hints.** Read a run of digits, then one letter; multiply and add. / Use a lookup table for unit multipliers.  
**Approach.** Scan the string: accumulate digits into a number, and when a unit letter appears add number × multiplier to the total and reset the number. (O(n) time, O(1) space)  
**Edge cases.** Only one part; Parts out of order; Large counts need 64-bit

### camelCase to snake_case
`dc-d-camel-to-snake` · easy · 20 min

Convert an identifier from camelCase to snake_case: every uppercase letter becomes its lowercase form preceded by an underscore. The input has only letters and starts with a lowercase letter.

**Input.** One identifier.  
**Output.** The snake_case identifier.  
**Constraints.** 1 ≤ length ≤ 100  
**Example.** `parseHttpHeader` → `parse_http_header` (parse_http_header)  
**Example.** `count` → `count` (no capitals, unchanged)  
**Hints.** Check each character; if it is uppercase, insert an underscore first. / Lowercase the letter before appending.  
**Approach.** Iterate the characters, emitting '_' plus the lowercase letter for uppercase ones and the letter itself otherwise. (O(n) time, O(n) space)  
**Edge cases.** No uppercase letters; Consecutive capitals like xHTTP; Single letter

### Read a Roman numeral
`dc-d-roman-reader` · easy · 20 min

Convert a valid Roman numeral to an integer. Symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. A smaller symbol before a larger one is subtracted (IV = 4, XC = 90).

**Input.** One Roman numeral.  
**Output.** The integer value.  
**Constraints.** Value from 1 to 3999  
**Example.** `MCMXCIV` → `1994` (1000 + 900 + 90 + 4 = 1994)  
**Example.** `VIII` → `8` (5 + 3)  
**Hints.** Compare each symbol with the one that follows it. / If it is smaller than the next, subtract it; otherwise add it.  
**Approach.** Scan left to right adding each symbol's value, but subtract it when the next symbol is larger. (O(n) time, O(1) space)  
**Edge cases.** Single symbol; Subtractive pairs at the end; Longest numerals like MMMCMXCIX

### Which version is newer
`dc-d-version-order` · easy · 20 min

Compare two dotted version strings such as 1.10.2 and 1.9. Compare numerically part by part from the left; a missing part counts as 0, so 1.0 equals 1.0.0. Print 1 if the first is newer, -1 if the second is newer, 0 if equal.

**Input.** Two version strings separated by a space.  
**Output.** 1, -1 or 0.  
**Constraints.** Each version has 1 to 10 parts; each part ≤ 10^6  
**Example.** `1.10.2 1.9` → `1` (10 > 9 in the second part -> 1)  
**Example.** `2.0 2.0.0` → `0` (trailing zeros are equal -> 0)  
**Hints.** Split on dots and convert each part to an integer; comparing as text would put 10 before 9. / Pad the shorter list with zeros.  
**Approach.** Split both versions, convert to integers, pad the shorter with zeros, and compare lexicographically. (O(parts) time and space)  
**Edge cases.** Different lengths; Leading zeros like 1.01; Equal versions

### Tally the log levels
`dc-d-log-level-tally` · easy · 25 min

Each log line looks like HH:MM:SS [LEVEL] message words..., for example 12:03:44 [WARN] disk almost full. Count how many lines carry each level and print the levels in alphabetical order with their counts. Ignore the message text, even if it contains brackets.

**Input.** Several log lines, one per line.  
**Output.** One line per level present: the level, a space, and its count, sorted alphabetically.  
**Constraints.** ≤ 10^5 lines; levels are uppercase letters  
**Example.** `01:00:00 [INFO] boot
01:00:05 [WARN] [x] low
01:01:00 [INFO] ready` → `INFO 2
WARN 1` (INFO 2, WARN 1 (on separate lines))  
**Example.** `09:09:09 [ERROR] oops` → `ERROR 1` (ERROR 1)  
**Hints.** The level is the first bracketed word after the timestamp. / Count with a dictionary and sort the keys at the end.  
**Approach.** Extract the bracketed level token from each line (the second space-separated token), increment a counter, then output sorted by key. (O(n + k log k) time, O(k) space)  
**Edge cases.** Brackets inside the message; Only one level; Many lines

### Fill the template
`dc-d-fill-the-template` · easy · 25 min

A template contains placeholders written as {name}. Replace each placeholder with the value from a list of name=value definitions. Placeholders whose name is not defined stay exactly as written. Substituted values are not scanned again for placeholders.

**Input.** First line the template; following lines are name=value definitions.  
**Output.** The completed text.  
**Constraints.** Template length ≤ 10^4; ≤ 100 definitions; names are letters, digits or underscore  
**Example.** `Hi {name}, you owe {amt}.
name=Ada
amt=5` → `Hi Ada, you owe 5.` (Hi Ada, you owe 5.)  
**Example.** `{a}{b}{a}
a=x` → `x{b}x` ({b} is undefined and stays -> x{b}x)  
**Hints.** Scan for '{' then read up to the next '}' to get the name. / Look the name up; if missing, copy the placeholder back unchanged.  
**Approach.** One pass over the template: copy ordinary characters, and when a well-formed {name} appears, output the mapped value or the original text if the name is undefined. (O(n + total value length) time, O(n) space)  
**Edge cases.** Undefined name; Adjacent placeholders; Value that itself contains braces

## prefix-sums

### Range totals
`dc-a-range-totals` · easy · 25 min

A bakery logs how many loaves it sold each day. Answer q questions of the form "how many loaves were sold from day l through day r (inclusive, 0-based)?" quickly.

**Input.** Line 1: n daily counts; line 2: q; then q lines each with l and r.  
**Output.** q lines, one total each.  
**Constraints.** 1 ≤ n, q ≤ 10^5; |values| ≤ 10^4  
**Example.** `1 2 3 4 5
3
0 2
1 3
4 4` → `6
9
5` (1+2+3, 2+3+4, and the single value 5.)  
**Example.** `10 -2 7
2
0 2
1 1` → `15
-2` (10-2+7 = 15 and the single -2.)  
**Hints.** Precompute prefix[i] = sum of the first i items. / Answer = prefix[r+1] - prefix[l].  
**Approach.** Build a prefix array with prefix[0]=0 and prefix[i+1]=prefix[i]+a[i]. Each query is prefix[r+1]-prefix[l] in constant time. (O(n + q) time, O(n) space)  
**Edge cases.** query of a single day; whole range; negative values

### The balance point
`dc-a-balance-point` · easy · 25 min

On a seesaw, weights are placed at positions 0..n-1. A balance point is a position whose left side total equals its right side total (the weight at the point itself is not counted on either side, and an empty side counts as 0). Print the leftmost balance point, or -1.

**Input.** One line of n integers.  
**Output.** An index or -1.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `2 3 -1 8 4` → `3` (Left of index 3: 2+3-1=4; right: 4.)  
**Example.** `1 2 3` → `-1` (No index has equal sides.)  
**Hints.** Compute the total sum once. / Walk left to right keeping the left sum; the right sum is total - left - current.  
**Approach.** Compute the total, then iterate with a running left sum. At index i the right sum is total - left - a[i]; return the first i where left equals right. (O(n) time, O(1) extra space)  
**Edge cases.** balance at index 0; balance at the last index; no balance

### First day in the red
`dc-a-first-day-in-the-red` · easy · 20 min

An account starts at 0. Each day a deposit (positive) or withdrawal (negative) is applied. Print the 1-based number of the first day after which the balance is below zero, or -1 if it never goes below zero.

**Input.** One line of n integers.  
**Output.** An integer day or -1.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `5 -3 -4 2` → `3` (Balance goes 5, 2, -2: negative after day 3.)  
**Example.** `1 2` → `-1` (Never negative.)  
**Hints.** Keep a running balance. / Stop at the first time it is below 0.  
**Approach.** Maintain the running sum while scanning; return the 1-based index the first time it drops below zero, otherwise -1. (O(n) time, O(1) space)  
**Edge cases.** negative on day 1; exactly zero is not negative; all positive

### Plot of land totals
`dc-a-plot-of-land-totals` · easy · 40 min

A farm is a grid of plots, each with a crop yield. Answer q queries asking for the total yield inside a rectangle given by its top-left and bottom-right plots (0-based, inclusive).

**Input.** Line 1: rows and columns; then the grid rows; then q; then q lines "r1 c1 r2 c2".  
**Output.** q lines, one total each.  
**Constraints.** 1 ≤ rows, cols ≤ 500; 1 ≤ q ≤ 10^5; |values| ≤ 1000  
**Example.** `3 3
1 2 3
4 5 6
7 8 9
2
0 0 1 1
1 1 2 2` → `12
28` (1+2+4+5 = 12 and 5+6+8+9 = 28.)  
**Example.** `2 2
1 1
1 1
1
0 0 1 1` → `4` (All four cells.)  
**Hints.** Build a 2D prefix table P where P[i][j] is the sum of the top-left i by j block. / Inclusion-exclusion: whole - top strip - left strip + overlap.  
**Approach.** Build P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] - P[i][j]. A query is P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]. (O(rc + q) time, O(rc) space)  
**Edge cases.** single cell; whole grid; negative values

### Bulk price changes
`dc-a-bulk-price-changes` · easy · 30 min

A catalogue lists item prices. You receive q updates, each adding an amount v to every price in a range l..r (inclusive, 0-based). Apply all updates and print the final prices, doing it faster than touching every item for every update.

**Input.** Line 1: n prices; line 2: q; then q lines "l r v".  
**Output.** The final prices.  
**Constraints.** 1 ≤ n, q ≤ 10^5; |v| ≤ 10^4  
**Example.** `0 0 0 0 0
2
1 3 2
2 4 5` → `0 2 7 7 5` (Indices 1..3 get +2, then 2..4 get +5.)  
**Example.** `10 20
1
0 1 -5` → `5 15` (Both prices drop by 5.)  
**Hints.** Record +v at l and -v at r+1 in a difference array. / A running sum of the difference array gives each item's total change.  
**Approach.** Keep a difference array d: add v to d[l] and subtract v from d[r+1]. After all updates, take the prefix sum of d and add it to the original prices. (O(n + q) time, O(n) space)  
**Edge cases.** update covering the whole array; update at the last index; overlapping updates

### Safe starting fuel
`dc-a-safe-starting-fuel` · easy · 25 min

A rover starts with some integer amount of fuel and then passes through a series of stations; each changes the fuel by the given amount (positive adds, negative uses). The fuel must stay at least 1 after every station. Find the smallest starting fuel (a positive integer) that works.

**Input.** One line of n integers.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `2 -5 1 -1 3` → `4` (Running changes: 2, -3, -2, -3, 0 — lowest is -3, so start with 4.)  
**Example.** `1 2` → `1` (The running total never dips below 0.)  
**Hints.** Look at the lowest prefix sum. / Start + lowest prefix must be ≥ 1.  
**Approach.** Compute the minimum prefix sum m (with 0 allowed as the starting value). The start must satisfy start + m ≥ 1, so the answer is 1 - m. (O(n) time, O(1) space)  
**Edge cases.** all positive; first value very negative; single element

### Fair cut points
`dc-a-fair-cut-points` · easy · 25 min

Cut a row of values into a non-empty left part and a non-empty right part at one of the n-1 gaps. Count the cuts where the left part's sum is at least the right part's sum.

**Input.** One line of n integers (n ≥ 2).  
**Output.** One integer.  
**Constraints.** 2 ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `3 1 -2 4` → `2` (Total is 6: cuts give 3 vs 3 (ok), 4 vs 2 (ok), 2 vs 4 (not ok).)  
**Example.** `1 1` → `1` (1 ≥ 1.)  
**Hints.** Right sum = total - left sum. / Scan the cut positions with a running left sum.  
**Approach.** Compute the total, then for each cut position 1..n-1 maintain the left sum and compare with total - left, counting cuts where left ≥ right. (O(n) time, O(1) extra space)  
**Edge cases.** n = 2; negative values; all equal

## queues

### Hot potato circle
`dc-b-hot-potato` · easy · 25 min

n kids numbered 1..n stand in a circle and the potato starts with kid 1, who counts as 1. Counting k kids around the circle, the kid who gets count k leaves, and counting restarts from the next kid. Print the number of the last kid standing.

**Input.** One line with integers n and k.  
**Output.** The number of the last remaining kid.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ k ≤ 10^5  
**Example.** `5 2` → `3` (Kids leave in the order 2, 4, 1, 5; kid 3 remains.)  
**Example.** `7 3` → `4` (Leaving order 3, 6, 2, 7, 5, 1; kid 4 remains.)  
**Hints.** Model the circle as a queue and simulate. / Move k-1 kids from the front to the back, then remove the front kid.  
**Approach.** Put 1..n in a deque. Repeat: rotate k-1 kids from front to back, then pop the front. When one remains it is the answer. Simulation costs O(nk); a modulo shortcut can skip the rotations. (O(n*k) time with a plain queue, O(n) space)  
**Edge cases.** n = 1; k = 1; k larger than n

### Recent pings
`dc-b-recent-pings` · easy · 25 min

A server logs ping timestamps in milliseconds, in non-decreasing order. After each ping, report how many pings (including this one) arrived in the last 3000 ms, meaning timestamps in [t-3000, t].

**Input.** One line of non-decreasing integers.  
**Output.** One line with the count after each ping.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ t ≤ 10^9  
**Example.** `1 100 3001 3002` → `1 2 3 3` (At 3001 the window [1,3001] holds 3 pings; at 3002 the window [2,3002] has 100, 3001, 3002.)  
**Example.** `500 4000 4500 7500` → `1 1 2 2` (500 expires before 4000; at 7500 only 4500 and 7500 remain.)  
**Hints.** Old pings never become relevant again. / Keep a queue; drop from the front while the front is older than t-3000.  
**Approach.** Append each timestamp to a queue and pop from the front while it is older than t-3000. The queue length is the answer. (O(n) amortised time, O(n) space)  
**Edge cases.** Equal timestamps; Gaps larger than 3000; A single ping

### Card reveal trick
`dc-b-card-reveal-trick` · easy · 25 min

A magician deals a pile: reveal the top card, then move the next top card to the bottom without showing it, and repeat until the pile is gone. The last remaining card is simply revealed. Given the pile from top to bottom, list the cards in reveal order.

**Input.** One line of integers, the pile top to bottom.  
**Output.** The reveal order on one line.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `1 2 3 4 5` → `1 3 5 4 2` (Reveal 1 (move 2), reveal 3 (move 4), reveal 5 (move 2), reveal 4 (move 2), reveal 2.)  
**Example.** `9 8 7` → `9 7 8` (Reveal 9 (move 8), reveal 7 (move 8), reveal 8.)  
**Hints.** A queue models a pile with a top and a bottom. / Pop front to output, then pop front again and push it to the back, if anything remains.  
**Approach.** Use a deque. Loop: pop the front into the output, and if cards remain, pop the next front and append it to the back. (O(n) time, O(n) space)  
**Edge cases.** One card; Two cards; Large pile

### Binary ticket numbers
`dc-b-binary-ticket-numbers` · easy · 25 min

A raffle numbers its tickets with the binary numbers 1, 10, 11, 100, ... in increasing order. Generate the first n ticket numbers as strings, using a queue rather than converting integers.

**Input.** One line with the integer n.  
**Output.** The first n binary strings separated by spaces.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `5` → `1 10 11 100 101` (1, 10, 11, 100, 101.)  
**Example.** `1` → `1` (Only the first ticket: 1.)  
**Hints.** Each number x spawns the next ones x0 and x1. / Start the queue with 1; pop x, output it, push x+'0' then x+'1'.  
**Approach.** Seed a queue with '1'. Repeat n times: pop the front, record it, and enqueue the front with '0' appended and then '1' appended. This yields numbers in increasing order. (O(n) strings generated (O(n log n) characters))  
**Edge cases.** n = 1; n a power of two; Large n

### First fresh letter
`dc-b-first-fresh-letter` · easy · 25 min

Letters arrive one at a time. After each arrival, report the first letter in the stream so far that has appeared exactly once, or # if there is none.

**Input.** One line of lowercase letters.  
**Output.** A string of the same length with the answer after each arrival.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `aabc` → `a#bb` (After a: a; after aa: none; after aab: b; after aabc: b.)  
**Example.** `xyxy` → `xxy#` (x, x, then y once x repeats, then # when both repeat. Result xxy#.)  
**Hints.** The answer can only move forward in arrival order. / Queue candidates in arrival order with a count table; discard the front while its count exceeds 1.  
**Approach.** Keep a count per letter and a queue of letters in arrival order. After each arrival, pop front letters whose count is above 1; the front (if any) is the answer. (O(n) time, O(1) alphabet space plus queue)  
**Edge cases.** All letters distinct; All same letter; Single letter

### Queue from two stacks
`dc-b-queue-from-stacks` · easy · 25 min

Build a first-in-first-out queue using only two stacks. Process commands push x, pop and peek; pop and peek print the front value, or -1 if the queue is empty, and pop also removes it.

**Input.** One line of commands separated by commas.  
**Output.** The printed values for pop and peek commands, space-separated.  
**Constraints.** 1 ≤ commands ≤ 10^5  
**Example.** `push 1,push 2,peek,pop,push 3,pop,pop` → `1 1 2 3` (peek 1, pop 1, then pop 2 and pop 3 in arrival order: 1 1 2 3.)  
**Example.** `pop,push 5,pop,pop` → `-1 5 -1` (pop on empty gives -1, then 5, then -1.)  
**Hints.** One stack takes new items; the other serves the front. / Only refill the out-stack when it is empty, moving everything from the in-stack.  
**Approach.** Use an in-stack for pushes and an out-stack for pops. When the out-stack is empty, move all items from the in-stack; the out-stack top is then the queue front. Each item moves at most once. (Amortised O(1) per operation, O(n) space)  
**Edge cases.** Pop on empty queue; Interleaved push and pop; Peek does not remove

### Ticket line timing
`dc-b-ticket-line-time` · easy · 25 min

People stand in a line, and person i wants t[i] tickets. Each second the person at the front buys exactly one ticket; if they still want more they go to the back, otherwise they leave. Find how many seconds pass until person k has bought all their tickets.

**Input.** Line 1: the wishes t. Line 2: the index k (0-based).  
**Output.** The number of seconds until person k is done.  
**Constraints.** 1 ≤ n ≤ 10^3; 1 ≤ t[i] ≤ 100  
**Example.** `2 3 2
2` → `6` (Seconds: p0,p1,p2,p0,p1,p2 - person 2 finishes at second 6.)  
**Example.** `5 1 1
0` → `7` (p0,p1,p2 buy first, then p0 buys alone for 4 more seconds: 7.)  
**Hints.** A direct simulation with a queue works for these limits. / Faster: person i contributes min(t[i], t[k]) seconds if i ≤ k, otherwise min(t[i], t[k]-1).  
**Approach.** Simulate with a queue of (index, remaining) until person k reaches zero. Or compute the sum of per-person contributions directly in O(n). (O(n) with the formula; O(n * max t) for simulation)  
**Edge cases.** k is the first person; k is the last person; Everyone wants one ticket

### Reverse the front of the queue
`dc-b-reverse-front-k` · easy · 25 min

Given a queue of integers and a number k, reverse the order of the first k elements while keeping the rest in their original order. Use queue operations (and perhaps one stack) in your solution.

**Input.** Line 1: the queue front to back. Line 2: k.  
**Output.** The resulting queue, front to back.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5  
**Example.** `1 2 3 4 5
3` → `3 2 1 4 5` (The first three become 3 2 1; 4 5 stay.)  
**Example.** `7 8 9
3` → `9 8 7` (The whole queue reverses to 9 8 7.)  
**Hints.** A stack reverses whatever you pour into it. / Pop k items into a stack, push them back to the queue, then rotate the remaining n-k items behind them.  
**Approach.** Dequeue the first k elements onto a stack, then enqueue them back from the stack (reversed). Finally dequeue and re-enqueue the remaining n-k elements so they follow the reversed block. (O(n) time, O(k) extra space)  
**Edge cases.** k = 1 (unchanged); k = n; Single element

### Single window total wait
`dc-b-single-window-wait` · easy · 25 min

A service desk has one window and serves customers in arrival order. Customer i arrives at time a[i] (non-decreasing) and needs d[i] minutes; service starts as soon as the window is free and the customer has arrived. Compute the sum of all waiting times (service start minus arrival).

**Input.** Line 1: arrival times. Line 2: service durations.  
**Output.** The total waiting time.  
**Constraints.** 1 ≤ n ≤ 10^5; times up to 10^9; total fits in 64-bit  
**Example.** `0 1 2
5 3 2` → `10` (Customer 2 starts at 5 (waits 4), customer 3 starts at 8 (waits 6): total 10.)  
**Example.** `0 10
3 3` → `0` (The window is free when each customer arrives: total 0.)  
**Hints.** Track when the window next becomes free. / Start = max(free time, arrival); wait += start - arrival; free = start + duration.  
**Approach.** Keep a variable for the time the window becomes free. For each customer in order compute the start time as max(free, arrival), add the wait, and update the free time. (O(n) time, O(1) space)  
**Edge cases.** Window idle between customers; Everyone arrives at time 0; Single customer

## recursion

### Digit total by recursion
`dc-c-digit-total` · easy · 20 min

Write a function that returns the sum of the decimal digits of a non-negative integer n without using loops or string conversion; the function should call itself on a smaller number. Print the digit sum of the given n.

**Input.** One integer n.  
**Output.** One integer: the sum of its digits.  
**Constraints.** 0 ≤ n ≤ 10^18  
**Example.** `4096` → `19` (4+0+9+6 = 19.)  
**Example.** `0` → `0` (Zero has digit sum 0, the base case.)  
**Hints.** What is the answer for n = 0? That is your base case. / The last digit is n % 10 and the rest is n // 10.  
**Approach.** sum(n) = 0 when n = 0, otherwise n % 10 + sum(n // 10). Depth is at most 19. (O(log n) time, O(log n) stack)  
**Edge cases.** n = 0; Single digit; Number with many zeros

### Fast power with a remainder
`dc-c-modular-power` · easy · 25 min

Compute a raised to the power b, taken modulo m, using recursion that halves the exponent each time (so that b up to 10^18 is fine). Print the remainder.

**Input.** One line with three integers a b m.  
**Output.** One integer: a^b mod m.  
**Constraints.** 0 ≤ a ≤ 10^9; 0 ≤ b ≤ 10^18; 1 ≤ m ≤ 10^9  
**Example.** `2 10 1000` → `24` (1024 mod 1000 is 24.)  
**Example.** `5 0 7` → `1` (Anything to the power 0 is 1.)  
**Hints.** a^b = (a^(b/2))^2 when b is even; multiply by a once more when odd. / Reduce modulo m after every multiplication.  
**Approach.** pow(a,b): if b = 0 return 1 mod m; let h = pow(a, b//2); return h·h mod m, times a mod m when b is odd. Depth is about 60. (O(log b) time, O(log b) stack)  
**Edge cases.** b = 0; m = 1 (answer 0); a = 0

### Does the word mirror itself
`dc-c-mirror-word` · easy · 20 min

A word reads the same forwards and backwards if it is a palindrome. Decide recursively: a word is a palindrome if its first and last letters match and the part between them is also a palindrome. Report the result for a lowercase word.

**Input.** One lowercase word.  
**Output.** YES if palindrome, otherwise NO.  
**Constraints.** 1 ≤ length ≤ 5000  
**Example.** `level` → `YES` (l-e-v-e-l matches from both ends.)  
**Example.** `garden` → `NO` (g and n differ immediately.)  
**Hints.** Define the check on the index range (i, j). / Stop with true when the range has 0 or 1 letters.  
**Approach.** check(i,j) = true if i ≥ j, else w[i] == w[j] and check(i+1, j-1). (O(n) time, O(n) stack)  
**Edge cases.** Single letter; Even length palindrome; Mismatch only in the middle

### Rabbit pair growth
`dc-c-rabbit-pairs` · easy · 20 min

A farmer's rabbit population follows R(0) = 0, R(1) = 1 and R(k) = R(k-1) + R(k-2) for k ≥ 2. Compute R(n) with recursion, making sure you do not recompute the same value over and over.

**Input.** One integer n.  
**Output.** One integer: R(n).  
**Constraints.** 0 ≤ n ≤ 90  
**Example.** `10` → `55` (0,1,1,2,3,5,8,13,21,34,55.)  
**Example.** `1` → `1` (Base case.)  
**Hints.** The naive version makes an exponential number of calls. / Store computed values in a map or array (memoization).  
**Approach.** Recursive function with a memo table so each R(k) is computed once. Answers fit in 64-bit up to n = 90. (O(n) time, O(n) space)  
**Edge cases.** n = 0; n = 1; n = 90 (large value)

### Tower of discs
`dc-c-tower-moves` · easy · 30 min

There are three pegs A, B, C and n discs of different sizes stacked on A with the smallest on top. Move all discs to peg C, moving one disc at a time and never placing a larger disc on a smaller one. Print one shortest sequence of moves, using the standard recursive scheme (move n-1 to the spare peg, move the largest, move n-1 on top).

**Input.** One integer n.  
**Output.** One move per line as X->Y (source peg, destination peg).  
**Constraints.** 1 ≤ n ≤ 5  
**Example.** `1` → `A->C` (A single disc goes straight to C.)  
**Example.** `3` → `A->C
A->B
C->B
A->C
B->A
B->C
A->C` (Seven moves, built from the two-disc solution twice around the biggest disc.)  
**Hints.** To move n discs from X to Z via Y, first solve it for n-1 from X to Y. / Then move the largest disc X->Z and solve n-1 from Y to Z.  
**Approach.** solve(n,X,Y,Z): if n = 0 return; solve(n-1,X,Z,Y); output X->Z; solve(n-1,Y,X,Z). This takes 2^n - 1 moves, the minimum. (O(2^n) time, O(n) stack)  
**Edge cases.** n = 1; Order of the recursive calls; Largest n

### List all bit strings
`dc-c-bit-strings` · easy · 20 min

Print every binary string of length n, one per line, in increasing order (as if reading them as binary numbers). Build them recursively one character at a time.

**Input.** One integer n.  
**Output.** 2^n lines, each a binary string of length n.  
**Constraints.** 1 ≤ n ≤ 10  
**Example.** `2` → `00
01
10
11` (Four strings in order.)  
**Example.** `3` → `000
001
010
011
100
101
110
111` (Eight strings, 000 through 111.)  
**Hints.** At each position you choose 0 or 1. / Try 0 before 1 to get increasing order.  
**Approach.** Recursive function building a prefix; when its length reaches n, output it; otherwise recurse with '0' appended then '1'. (O(n · 2^n) time, O(n) stack)  
**Edge cases.** n = 1; Order of branches; Largest n output size

### Euclid and its calls
`dc-c-euclid-calls` · easy · 20 min

Euclid's method is gcd(a, b) = a if b = 0, otherwise gcd(b, a mod b). Run it recursively on two integers and report both the gcd and the total number of calls to the function made, counting the first call and the final one with b = 0.

**Input.** One line with integers a and b.  
**Output.** Two integers: the gcd and the number of calls.  
**Constraints.** 0 ≤ a, b ≤ 10^18, not both 0  
**Example.** `48 18` → `6 4` (gcd(48,18) -> (18,12) -> (12,6) -> (6,0): 4 calls, gcd 6.)  
**Example.** `7 0` → `7 1` (Immediately hits the base case: gcd 7, 1 call.)  
**Hints.** Count by incrementing a counter at the top of the function. / Note a < b swaps them on the first step.  
**Approach.** Implement gcd recursively with a counter incremented per call. The number of calls is O(log min(a,b)). (O(log min(a,b)) time, same stack)  
**Edge cases.** b = 0; a < b; a equals b

### Hailstone length
`dc-c-hailstone-steps` · easy · 20 min

Start from n. If the current number is even, halve it; if odd, replace it by 3 times itself plus 1. Count the steps until the value becomes 1. Implement it as a recursive function.

**Input.** One integer n.  
**Output.** The number of steps to reach 1.  
**Constraints.** 1 ≤ n ≤ 10^6  
**Example.** `6` → `8` (6,3,10,5,16,8,4,2,1 is 8 steps.)  
**Example.** `1` → `0` (Already 1, zero steps.)  
**Hints.** The base case is n = 1. / One step plus the answer for the next value.  
**Approach.** steps(1) = 0; steps(n) = 1 + steps(next(n)). The sequence is finite for the allowed inputs and fits in 64-bit integers. (O(steps) time, O(steps) stack)  
**Edge cases.** n = 1; Power of two; Odd start

### Ruler tick heights
`dc-c-ruler-marks` · easy · 20 min

A ruler of order n has 2^n - 1 tick marks. The middle tick has height n, and each half is a ruler of order n-1. List the heights of the ticks from left to right.

**Input.** One integer n.  
**Output.** The tick heights separated by spaces.  
**Constraints.** 1 ≤ n ≤ 12  
**Example.** `2` → `1 2 1` (1 2 1: a middle tick of height 2 flanked by order-1 rulers.)  
**Example.** `3` → `1 2 1 3 1 2 1` (Order-2 ruler, then 3, then order-2 ruler again.)  
**Hints.** The pattern is self-similar. / ruler(n) = ruler(n-1) + [n] + ruler(n-1), with ruler(0) empty.  
**Approach.** Build the list recursively as left half, middle value n, right half. Output length is 2^n - 1. (O(2^n) time, O(n) stack)  
**Edge cases.** n = 1; n = 12 output size; Order of concatenation

### How deep do the brackets nest
`dc-c-bracket-depth` · easy · 25 min

A string of balanced parentheses is given, such as (()(())). Its nesting depth is the largest number of parentheses open at the same time. Compute it by recursing into each parenthesized group. An empty string has depth 0.

**Input.** One line with a balanced parentheses string (possibly empty).  
**Output.** One integer: the maximum nesting depth.  
**Constraints.** 0 ≤ length ≤ 10^4 (nesting at most 2000)  
**Example.** `(()(()))` → `3` (The innermost pair sits three levels deep.)  
**Example.** `()()()` → `1` (Pairs are side by side, depth 1.)  
**Hints.** The depth of a group is 1 plus the deepest group inside it. / Sibling groups combine with max, not with a sum.  
**Approach.** Parse recursively: a group starts at '(', parses inner groups until the matching ')', and returns 1 + max child depth. The top level takes the max over siblings. (O(n) time, O(depth) stack)  
**Edge cases.** Empty string; Fully nested chain; Many siblings

## simulation

### Robot on a doormat
`dc-d-robot-doormat` · easy · 20 min

A vacuum robot starts at (0, 0) and follows a string of commands: U moves up (y+1), D down, L left (x-1), R right. Report where it ends and whether it ended on its starting spot.

**Input.** One line of commands made of U, D, L, R.  
**Output.** Final x, final y, then YES if back at the origin otherwise NO, separated by spaces.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `UURDDL` → `0 0 YES` (net movement is zero in both axes -> '0 0 YES')  
**Example.** `RRRU` → `3 1 NO` (three right, one up -> '3 1 NO')  
**Hints.** Keep two integers and update them per command. / Only the final position matters, not the path.  
**Approach.** Walk through the commands updating x and y, then compare with zero. (O(n) time, O(1) space)  
**Edge cases.** Single command; Returns to origin midway but not at the end; Very long input

### Circle elimination
`dc-d-circle-elimination` · easy · 25 min

n children stand in a circle numbered 1..n. Starting at child 1, count k children (including the starting one) and send the k-th home, then continue counting from the next child. The last child left wins. Which number wins?

**Input.** Two integers n and k.  
**Output.** The number of the last remaining child.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ k ≤ 10^5  
**Example.** `5 2` → `3` (out order 2, 4, 1, 5; child 3 remains)  
**Example.** `1 7` → `1` (only one child)  
**Hints.** With n up to 10^5 and a list, deletions cost O(n) each; consider a recurrence instead. / If W(m) is the winner's 0-based index among m children, W(m) = (W(m-1) + k) mod m.  
**Approach.** Use the Josephus recurrence: r = 0; for m from 2 to n, r = (r + k) mod m; the answer is r + 1. (O(n) time, O(1) space)  
**Edge cases.** n = 1; k = 1 (last child wins); k larger than n

### What colour is the light
`dc-d-traffic-light-clock` · easy · 20 min

A traffic light cycles GREEN for g seconds, YELLOW for y seconds, then RED for r seconds, repeating forever, starting a green phase at second 0. What colour is showing during second t (the interval [t, t+1))?

**Input.** Four integers g, y, r, t on one line.  
**Output.** GREEN, YELLOW or RED.  
**Constraints.** 1 ≤ g, y, r ≤ 10^6; 0 ≤ t ≤ 10^18  
**Example.** `30 5 25 62` → `GREEN` (62 mod 60 = 2 -> GREEN)  
**Example.** `30 5 25 58` → `RED` (58 is in the red phase (35..59))  
**Hints.** The pattern repeats every g + y + r seconds. / Reduce t modulo the cycle and compare against thresholds.  
**Approach.** Compute c = t mod (g + y + r); GREEN if c < g, YELLOW if c < g + y, else RED. (O(1) time and space)  
**Edge cases.** t = 0; t exactly on a boundary; Huge t

### Elevator odometer
`dc-d-elevator-odometer` · easy · 20 min

An elevator starts at floor s and serves requests strictly in the given order, moving one floor per unit of distance. Compute the total number of floors it travels.

**Input.** First line m and s, second line m requested floors.  
**Output.** Total floors travelled.  
**Constraints.** 1 ≤ m ≤ 10^5; 0 ≤ floors ≤ 1000  
**Example.** `3 1
5 2 2` → `7` (1->5 is 4, 5->2 is 3, 2->2 is 0 -> 7)  
**Example.** `1 4
4` → `0` (already there -> 0)  
**Hints.** Keep the current floor and add absolute differences. / Repeated requests cost nothing.  
**Approach.** Iterate through requests adding |next - current| and updating current. (O(m) time, O(1) space)  
**Edge cases.** Request equals current floor; Only one request; Going down

### Pinball in a corridor
`dc-d-pinball-corridor` · easy · 25 min

A ball moves along a corridor of length L (positions 0..L) at v units per second, starting at position pos and heading towards L. When it hits an end it bounces back with the same speed. Where is it after t seconds? Positions are whole numbers.

**Input.** Four integers L, pos, v, t on one line.  
**Output.** The ball's position after t seconds.  
**Constraints.** 1 ≤ L ≤ 10^9; 0 ≤ pos ≤ L; 1 ≤ v ≤ 10^9; 0 ≤ t ≤ 10^9  
**Example.** `10 3 4 5` → `3` (3 + 4·5 = 23 and 23 mod 20 = 3, inside the corridor)  
**Example.** `10 0 1 13` → `7` (goes to 10, comes back 3 units to 7)  
**Hints.** Unfold the corridor: imagine the ball moves straight on a line of period 2L. / Fold the unfolded coordinate back: x if x ≤ L else 2L - x.  
**Approach.** Compute x = (pos + v·t) mod 2L; the answer is x if x ≤ L else 2L - x. (O(1) time and space)  
**Edge cases.** t = 0; Lands exactly on an end; Huge product (use 64-bit)

### Vending machine change
`dc-d-vending-change` · easy · 25 min

A vending machine has limited coins: pennies (1), nickels (5), dimes (10) and quarters (25). To return a given amount it uses as many quarters as it can, then dimes, then nickels, then pennies, never exceeding the stock of any coin. Print how many of each it returns, or IMPOSSIBLE if it cannot pay the exact amount.

**Input.** First line the amount; second line four stock counts for pennies, nickels, dimes, quarters.  
**Output.** Four counts (pennies nickels dimes quarters) or IMPOSSIBLE.  
**Constraints.** 0 ≤ amount ≤ 10^4; 0 ≤ stock ≤ 10^4  
**Example.** `68
10 10 10 10` → `3 1 1 2` (two quarters, one dime, one nickel, three pennies -> 3 1 1 2)  
**Example.** `30
0 0 1 0` → `IMPOSSIBLE` (only one dime is available -> IMPOSSIBLE)  
**Hints.** Process coins from largest to smallest and take min(stock, remaining // value). / If the remainder is non-zero at the end the machine cannot make change.  
**Approach.** Greedy pass over denominations from high to low taking as many as stock allows; check that the remainder ends at zero. (O(1) time and space)  
**Edge cases.** Amount 0; Not enough stock; Exactly enough

### Spiral staircase numbering
`dc-d-spiral-fill` · easy · 25 min

Fill an n × n grid with the numbers 1 to n² in a clockwise spiral that starts at the top-left cell and goes right first, turning clockwise whenever the next cell is outside the grid or already filled. Print the grid.

**Input.** One integer n.  
**Output.** n lines each with n space-separated integers.  
**Constraints.** 1 ≤ n ≤ 50  
**Example.** `3` → `1 2 3
8 9 4
7 6 5` (rows are 1 2 3, then 8 9 4, then 7 6 5)  
**Example.** `1` → `1` (a single cell)  
**Hints.** Keep a direction vector and rotate it clockwise with (dr, dc) -> (dc, -dr). / Turn when the next cell is out of bounds or already non-zero.  
**Approach.** Walk from (0,0) with direction right, writing 1..n², turning clockwise when blocked. (O(n²) time and space)  
**Edge cases.** n = 1; n = 2; Odd n ends in the centre

### Ants on a plank
`dc-d-ants-on-a-plank` · easy · 20 min

Ants walk at speed 1 on a plank of length L. Each ant's start position is given, and every ant walks either left or right but you do not know which. Ants that meet turn around instantly, and an ant leaves when it reaches either end. What is the longest time until the plank is guaranteed empty in the worst case of directions? (Meeting ants swapping directions is the same as passing through each other.)

**Input.** First line n and L, second line n integer positions in [0, L].  
**Output.** The earliest time by which the plank is guaranteed empty.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ L ≤ 10^9  
**Example.** `3 10
2 5 9` → `9` (distances to the far end are 8, 5 and 9; the ant at 9 may need 9)  
**Example.** `1 7
0` → `7` (the ant at 0 must walk the whole plank -> 7)  
**Hints.** Pretend ants pass through each other; the set of positions is identical. / Each ant independently leaves after at most max(x, L - x).  
**Approach.** Treat collisions as pass-throughs; the answer is the maximum over ants of max(x, L - x). (O(n) time, O(1) space)  
**Edge cases.** Ant at an end; Ant exactly in the middle; n = 1

## sliding-window

### Best k-day stretch
`dc-a-best-three-days` · easy · 20 min

A farm stand records daily sales for n days. Find the largest total sales over any k consecutive days.

**Input.** Line 1: n daily sales; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `2 1 5 1 3 2
3` → `9` (Days 3 to 5: 5+1+3.)  
**Example.** `4 4
2` → `8` (The only window.)  
**Hints.** Compute the first window sum, then slide. / Add the entering value, subtract the leaving one.  
**Approach.** Compute the sum of the first k values, then slide one position at a time adding the new element and removing the oldest, tracking the maximum. (O(n) time, O(1) extra space)  
**Edge cases.** k = n; k = 1; negative values

### Stretch with no repeats
`dc-a-no-repeat-stretch` · easy · 30 min

Find the length of the longest contiguous piece of a string in which no character appears twice.

**Input.** One string.  
**Output.** One integer.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `xyzzxy` → `3` ("xyz" or "zxy".)  
**Example.** `tmmzuxt` → `5` ("mzuxt" has five distinct characters.)  
**Hints.** Maintain a window [l, r] with all-distinct characters. / Remember the last index of each character so l can jump.  
**Approach.** Expand r over the string; when s[r] was last seen inside the window, move l to just after that earlier occurrence. Record the best r-l+1. (O(n) time, O(alphabet) space)  
**Edge cases.** all same char; all distinct; length 1

### Warm enough windows
`dc-a-warm-enough-windows` · easy · 25 min

Given daily temperatures, count the windows of exactly k consecutive days whose average temperature is at least a threshold t.

**Input.** Line 1: n temperatures; line 2: k; line 3: t.  
**Output.** One integer.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5; values and t are integers, |values| ≤ 10^4  
**Example.** `1 6 3 8 2 7
2
5` → `2` (Windows (3,8)=5.5 and (8,2)=5.0 qualify.)  
**Example.** `5 5 5
3
5` → `1` (Average is exactly 5.)  
**Hints.** Avoid floating point: compare window sum with t*k. / Update the sum incrementally.  
**Approach.** Maintain the window sum and compare it with t*k at each position; each slide adds one value and removes one. (O(n) time, O(1) extra space)  
**Edge cases.** k = n; k = 1; negative temperatures

### Vowel-heavy window
`dc-a-vowel-heavy-window` · easy · 20 min

Among all substrings of length exactly k of a lowercase string, find the largest number of vowels (a, e, i, o, u) that any one of them contains.

**Input.** Line 1: the string; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ k ≤ length ≤ 10^5  
**Example.** `banana
3` → `2` ("ana" has two vowels.)  
**Example.** `xyz
2` → `0` (No vowels exist.)  
**Hints.** Keep a running count of vowels in the window. / Add 1 for an entering vowel and subtract 1 for a leaving vowel.  
**Approach.** Count vowels in the first k characters, then slide: add the entering character if it is a vowel and subtract the leaving one. Track the maximum. (O(n) time, O(1) extra space)  
**Edge cases.** no vowels; all vowels; k = length

## sorting

### Crowd favourites first
`dc-a-crowd-favourites-first` · easy · 25 min

Reorder a list of song ids so that ids that occur more often come first. Equal ids stay grouped together, and ids with the same count are ordered by smaller id first.

**Input.** One line of n integers.  
**Output.** The reordered list.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `4 6 4 2 6 4` → `4 4 4 6 6 2` (4 appears 3 times, 6 twice, 2 once.)  
**Example.** `5 3 5 3 1` → `3 3 5 5 1` (3 and 5 tie at 2, so 3 goes first; 1 last.)  
**Hints.** Count first, then sort with a custom key. / Key = (-count, value).  
**Approach.** Count the occurrences, then sort the list using the key (-count[x], x). Equal values end up adjacent because they share the same key. (O(n log n) time, O(n) space)  
**Edge cases.** all same; all distinct; negative ids

### Kth fastest lap
`dc-a-kth-fastest-lap` · easy · 20 min

Lap scores are recorded for a race, where a higher score is better. Print the k-th highest score, counting duplicates as separate laps (so two equal best scores are 1st and 2nd).

**Input.** Line 1: n scores; line 2: k.  
**Output.** One integer.  
**Constraints.** 1 ≤ k ≤ n ≤ 10^5  
**Example.** `5 2 9 1 7
2` → `7` (Sorted descending: 9 7 5 2 1.)  
**Example.** `3 3 3
3` → `3` (Duplicates count separately.)  
**Hints.** Sort in descending order and index k-1. / For large n a heap or quickselect avoids the full sort.  
**Approach.** Sort the scores in descending order and return the element at index k-1. A min-heap of size k would give O(n log k). (O(n log n) time, O(n) space)  
**Edge cases.** k = 1; k = n; duplicates

### Fan index
`dc-a-fan-index` · easy · 25 min

An author has papers with the given citation counts. Their index is the largest h such that at least h of their papers have at least h citations each. Print h.

**Input.** One line of n citation counts.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ values ≤ 10^6  
**Example.** `10 8 5 4 3` → `4` (Four papers have at least 4 citations (10, 8, 5, 4).)  
**Example.** `0 0` → `0` (No paper has any citation.)  
**Hints.** Sort in descending order. / Find the last position k (1-based) with value ≥ k.  
**Approach.** Sort descending. The answer is the largest k such that the k-th value is at least k. (O(n log n) time, O(1) extra space)  
**Edge cases.** all zeros; all large; n = 1

### House alphabet order
`dc-a-house-alphabet` · easy · 25 min

A company ranks letters by its own order string (no repeats). Sort a text by that ranking; letters missing from the order string go after all ranked letters, keeping their original relative order.

**Input.** Line 1: the order string; line 2: the text.  
**Output.** The sorted text.  
**Constraints.** 1 ≤ lengths ≤ 10^5; lowercase letters  
**Example.** `cba
abcabc` → `ccbbaa` (c before b before a.)  
**Example.** `zy
xyzxyz` → `zzyyxx` (z, y, then unranked x's in original order.)  
**Hints.** Map each ranked letter to its position. / Use a stable sort with unranked letters mapped to a large rank.  
**Approach.** Build a rank map from the order string, give unknown letters rank len(order), and do a stable sort of the text by rank. (O(n log n) time (or O(n + 26) with counting), O(n) space)  
**Edge cases.** letters not in order; single letter; order longer than text

### Closest neighbours
`dc-a-closest-neighbours` · easy · 25 min

Among a list of integers (values may repeat), find the smallest absolute difference between any two elements, and how many adjacent pairs in sorted order achieve it. Print both numbers.

**Input.** One line of n integers.  
**Output.** Two integers: the minimum difference and the number of sorted-adjacent pairs achieving it.  
**Constraints.** 2 ≤ n ≤ 10^5  
**Example.** `4 2 1 3` → `1 3` (Sorted 1 2 3 4: every adjacent gap is 1.)  
**Example.** `10 20 10` → `0 1` (Sorted 10 10 20: only the first gap is 0.)  
**Hints.** The smallest difference is always between sorted neighbours. / Compute all neighbour gaps after sorting.  
**Approach.** Sort the array, compute the gaps between consecutive elements, take their minimum and count how many gaps equal it. (O(n log n) time, O(n) space)  
**Edge cases.** duplicates; n = 2; large negative values

### Podium ranks
`dc-a-podium-ranks` · easy · 20 min

Contestants have distinct scores. Print each contestant's rank in the original order, where rank 1 is the highest score.

**Input.** One line of n distinct integers.  
**Output.** n ranks in input order.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `40 10 30` → `1 3 2` (40 is best, 30 second, 10 third.)  
**Example.** `5 100 -3 50` → `3 1 4 2` (100, 50, 5, -3 from best to worst.)  
**Hints.** Sort the scores to learn each rank. / Store rank by score in a map, then read it back in input order.  
**Approach.** Sort scores descending, assign rank = position + 1 in a map from score to rank, then output the rank for each original score. (O(n log n) time, O(n) space)  
**Edge cases.** n = 1; negative scores; already sorted

### Cheapest matchup
`dc-a-cheapest-matchup` · easy · 25 min

You have two lists of equal length: hours of work and hourly rates. Pair each hours value with exactly one rate (each used once, any pairing allowed) so that the sum of hours*rate is as small as possible. Print that minimum.

**Input.** Two lines of n positive integers.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; values ≤ 10^4  
**Example.** `1 3 5
2 4 6` → `28` (Pair 1·6 + 3·4 + 5·2 = 28.)  
**Example.** `1 2
3 3` → `9` (All rates equal, so the sum is (1+2)*3.)  
**Hints.** Pair the largest with the smallest. / Sort one list ascending and the other descending.  
**Approach.** By the rearrangement inequality the minimum sum of products pairs the smallest of one list with the largest of the other. Sort one ascending, the other descending, and sum the products. (O(n log n) time, O(n) space)  
**Edge cases.** n = 1; equal values; one huge value

### Canoe pairs
`dc-a-canoe-pairs` · easy · 30 min

Hikers with the given weights must cross a river in canoes. Each canoe carries at most two people and a total weight of at most cap (every hiker alone is guaranteed to fit). Print the smallest number of canoes needed.

**Input.** Line 1: n weights; line 2: cap.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5; each weight ≤ cap ≤ 10^9  
**Example.** `5 1 4 2
6` → `2` (5+1 and 4+2 each equal 6.)  
**Example.** `3 3 3
5` → `3` (No two hikers fit together.)  
**Hints.** Sort the weights. / Try to pair the heaviest with the lightest; if they do not fit, the heaviest goes alone.  
**Approach.** Sort, then use two pointers: always send the heaviest hiker; if the lightest also fits, send them together and advance the left pointer. Count canoes. (O(n log n) time, O(1) extra space)  
**Edge cases.** all fit pairwise; none fit; odd number of hikers

## stacks

### Balanced crate labels
`dc-b-balanced-crates` · easy · 25 min

A warehouse labels each crate stack with brackets: round, square and curly. A label is valid if every opener is closed by the same kind of closer, in the right nesting order. Decide whether a given label string is valid.

**Input.** One line containing only the characters ()[]{}.  
**Output.** true or false.  
**Constraints.** 0 ≤ length ≤ 10^5  
**Example.** `([]{})` → `true` (Every pair closes in the correct nesting order.)  
**Example.** `([)]` → `false` (The ] arrives while the most recent open bracket is (, so the nesting is broken.)  
**Hints.** Whenever you see an opener, you will need to remember it until its closer shows up. / Keep openers on a stack; on a closer, the top of the stack must be its partner. At the end the stack must be empty.  
**Approach.** Push each opener on a stack. For each closer, pop and check it matches, failing on an empty stack or mismatch. Valid only if the stack is empty at the end. (O(n) time, O(n) extra space)  
**Edge cases.** Empty string (valid); Starts with a closer; Only openers, never closed

### Typing with backspace
`dc-b-undo-typing` · easy · 25 min

A note app records keystrokes: letters are typed, and the character # is a backspace that deletes the previous letter (doing nothing on empty text). Given the keystroke string, print the text that ends up on screen.

**Input.** One line of lowercase letters and #.  
**Output.** The final text, or the word EMPTY if nothing remains.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `abc#d##e` → `ae` (ab, then abd, then ab, then a, then ae.)  
**Example.** `##x#` → `EMPTY` (Backspaces on empty text do nothing, and the last # erases x.)  
**Hints.** Think of the text as something where only the last character can be removed. / Use a list as a stack: push letters, pop on # if non-empty.  
**Approach.** Scan once, pushing letters on a stack and popping on #. Join the stack at the end. (O(n) time, O(n) extra space)  
**Edge cases.** Only # characters; # at the very start; Everything erased

### Postfix calculator
`dc-b-postfix-calculator` · easy · 25 min

A retro calculator takes expressions in postfix form: operands first, then the operator. Tokens are integers and the operators +, - and *. Evaluate the expression.

**Input.** One line of space-separated tokens forming a valid postfix expression.  
**Output.** The integer result.  
**Constraints.** 1 ≤ tokens ≤ 10^4; every intermediate value fits in 64-bit  
**Example.** `3 4 + 2 *` → `14` (3+4=7, then 7*2=14.)  
**Example.** `2 3 4 * -` → `-10` (3*4=12, then 2-12=-10.)  
**Hints.** When an operator appears, which two values does it use? / Push numbers; on an operator pop b then a and push a op b. Order matters for subtraction.  
**Approach.** Scan the tokens with a stack. Numbers are pushed; for an operator pop the right operand then the left, apply it and push the result. The remaining item is the answer. (O(n) time, O(n) extra space)  
**Edge cases.** Single number; Negative results; Subtraction operand order

### Strip the twin letters
`dc-b-strip-twin-letters` · easy · 25 min

Repeatedly delete any two equal letters that sit next to each other until no such pair remains. Print the final string; removals can create new neighbouring pairs.

**Input.** One line of lowercase letters.  
**Output.** The reduced string, or EMPTY if nothing is left.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `abbaca` → `ca` (bb goes first giving aaca, then aa goes, leaving ca.)  
**Example.** `azxxzy` → `ay` (xx goes, then the two z letters meet and go, leaving ay.)  
**Hints.** After removing a pair, which two letters become neighbours? / A stack gives you the previous surviving letter instantly: if it equals the new letter, pop.  
**Approach.** Process letters left to right with a stack. If the top equals the current letter, pop; otherwise push. The stack content is the answer. (O(n) time, O(n) extra space)  
**Edge cases.** No pairs; Entire string cancels; Three equal letters in a row

### Train shunting check
`dc-b-valid-train-shunt` · easy · 25 min

Distinct wagons arrive on a single siding in a known order and can be pushed onto a dead-end track; the wagon at the end may be pulled out at any time. Given the arrival order and a target departure order, decide whether the target can be produced.

**Input.** Two lines of distinct integers of equal length: arrival order, then desired departure order.  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 5
4 5 3 2 1` → `true` (Push 1-4, pull 4, push 5, pull 5, then 3, 2, 1.)  
**Example.** `1 2 3 4 5
4 3 5 1 2` → `false` (After pulling 4,3,5 the end wagon is 2, but 1 is wanted.)  
**Hints.** Simulate the track directly. / Push arrivals one by one and pull while the end wagon equals the next desired wagon.  
**Approach.** Push each arriving wagon on a stack and, after every push, pop while the top equals the next wagon of the target. The order is possible iff all target wagons were popped. (O(n) time, O(n) extra space)  
**Edge cases.** Single wagon; Same order as arrival; Fully reversed order

### Price streak
`dc-b-price-streak` · easy · 25 min

A trader records a share price each day. For every day, count how many consecutive days ending on that day (including itself) had a price less than or equal to that day's price.

**Input.** One line of positive integers, the daily prices.  
**Output.** One line with the streak length for each day.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `50 40 30 35 20 45 60` → `1 1 1 2 1 5 7` (On day 6 (45) the streak covers 45,20,35,30,40 so 5; the 60 beats everything, giving 7.)  
**Example.** `5 5 5 6` → `1 2 3 4` (Equal prices count, so streaks grow 1 2 3 4.)  
**Hints.** Scanning left each time is O(n^2). / Keep a stack of indices with strictly greater prices; the streak is the distance to the top.  
**Approach.** Maintain a stack of indices with decreasing prices. For day i pop all indices with price ≤ current, then the streak is i minus the new top index (or i+1 if empty). (O(n) time, O(n) extra space)  
**Edge cases.** Strictly increasing prices; Strictly decreasing prices; Single day

### Patch the parentheses
`dc-b-patch-parentheses` · easy · 25 min

A string of round brackets may be unbalanced. You may insert brackets anywhere. Find the minimum number of insertions needed so that every opener is matched with a later closer.

**Input.** One line containing only ( and ).  
**Output.** The minimum number of insertions.  
**Constraints.** 0 ≤ length ≤ 10^5  
**Example.** `())(` → `2` (The second ) has no opener and the last ( has no closer: 2 insertions.)  
**Example.** `(()` → `1` (One opener is never closed: 1 insertion.)  
**Hints.** Track how many openers are still waiting. / On a closer with nothing waiting you must add an opener; leftover waiting openers need closers.  
**Approach.** Scan with a counter of open brackets. A closer with zero open increases the insertion count; otherwise it decrements. The answer is insertions plus the leftover open count. (O(n) time, O(1) extra space)  
**Edge cases.** Empty string; All closers; Already balanced

### Game score keeper
`dc-b-score-keeper` · easy · 25 min

A game logs events: a number means you scored that many points, C cancels the previous valid score, D scores double the previous valid score, and + scores the sum of the previous two valid scores. Compute the total of all valid scores at the end.

**Input.** One line of space-separated tokens.  
**Output.** The total score.  
**Constraints.** 1 ≤ tokens ≤ 1000; operations are always valid  
**Example.** `5 2 C D +` → `30` (Scores 5, 2; C drops 2; D adds 10; + adds 15. Total 5+10+15=30.)  
**Example.** `3 D D +` → `39` (Scores 3, 6, 12, 18 so the total is 39.)  
**Hints.** You only ever look at or remove the most recent scores. / Keep valid scores on a stack and sum it at the end.  
**Approach.** Process tokens with a stack of valid scores: C pops, D pushes twice the top, + pushes the sum of the top two, numbers are pushed. Sum the stack. (O(n) time, O(n) extra space)  
**Edge cases.** Cancel everything; Negative scores; Only one token

## strings

### Mirror sentence
`dc-a-mirror-sentence` · easy · 20 min

A sentence is a mirror if, after dropping every character that is not a letter or digit and ignoring upper/lower case, it reads the same forwards and backwards. Decide whether the given line is a mirror.

**Input.** One line of text (may contain spaces and punctuation).  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `Never odd or even` → `true` (Without spaces: neveroddoreven reads the same both ways.)  
**Example.** `hello, olleh!x` → `false` (Cleaned: helloollehx; the trailing x breaks the symmetry.)  
**Hints.** Filter and lowercase first, or skip junk characters as you go. / Compare from both ends moving inwards.  
**Approach.** Use two pointers from both ends, skipping non-alphanumeric characters and comparing lower-cased characters. Any mismatch means false. (O(n) time, O(1) extra space)  
**Edge cases.** only punctuation; single character; mixed case

### Flip the headline
`dc-a-flip-the-headline` · easy · 20 min

Reverse the order of the words in a line of text. Words are separated by one or more spaces, and the input may have extra spaces at the start or end; the output must have words separated by exactly one space and no leading or trailing spaces.

**Input.** One line of text.  
**Output.** The words in reverse order.  
**Constraints.** 1 ≤ length ≤ 10^5; at least one word  
**Example.** `  the sky  is blue ` → `blue is sky the` (Extra spaces are collapsed after reversing.)  
**Example.** `one` → `one` (A single word is unchanged.)  
**Hints.** Splitting on whitespace discards empty pieces. / Reverse the list of words, then join with one space.  
**Approach.** Split the line into words ignoring runs of whitespace, reverse the list, and join with single spaces. (O(n) time, O(n) extra space)  
**Edge cases.** leading/trailing spaces; single word; many consecutive spaces

### The lonely letter
`dc-a-lonely-letter` · easy · 20 min

Find the position (0-based) of the first character in a string that occurs exactly once in the whole string. Print -1 if every character repeats.

**Input.** One lowercase string.  
**Output.** An integer index or -1.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `swiss` → `1` (s appears 3 times; w at index 1 appears once.)  
**Example.** `aabb` → `-1` (Every letter appears twice.)  
**Hints.** First count how often each letter appears. / Then scan left to right and return the first letter with count 1.  
**Approach.** Count character frequencies in one pass, then scan the string again and return the index of the first character whose count is 1. (O(n) time, O(1) extra space (26 letters))  
**Edge cases.** all same letter; unique letter at the end; length 1

### Same letters, new order
`dc-a-same-letters` · easy · 20 min

Two words are anagrams if one can be rearranged into the other using every letter exactly once. Given two lowercase words, say whether they are anagrams.

**Input.** Two lines, one word each.  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `triangle
integral` → `true` (Both use a,e,g,i,l,n,r,t once each.)  
**Example.** `rat
car` → `false` (They differ in one letter (t vs c).)  
**Hints.** Different lengths can never match. / Compare letter counts.  
**Approach.** Count letters of the first word, subtract counts of the second, and check all counts are zero (or compare sorted strings). (O(n) time, O(1) extra space)  
**Edge cases.** different lengths; repeated letters; length 1

### Run-length stamp
`dc-a-run-length-stamp` · easy · 20 min

Encode a string by replacing each maximal run of the same character with the character followed by the run length. A character that appears once is still written with the count 1.

**Input.** One lowercase string.  
**Output.** The encoded string.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `aaabccdddd` → `a3b1c2d4` (Runs: aaa, b, cc, dddd.)  
**Example.** `xyz` → `x1y1z1` (Every run has length 1.)  
**Hints.** Scan with a start index of the current run. / Extend the end while characters match, then emit char and length.  
**Approach.** Walk the string, and for each run find its end, append the character and the run length, and jump to the next run. (O(n) time, O(n) output)  
**Edge cases.** single character; one long run; run length ≥ 10

### The shared beginning
`dc-a-shared-beginning` · easy · 25 min

Given several words, find the longest string that is a prefix of every one of them. Print it, or "-" if the words share no starting letters.

**Input.** One line of space-separated lowercase words.  
**Output.** The longest common prefix, or "-".  
**Constraints.** 1 ≤ words ≤ 1000; each length ≤ 100  
**Example.** `interview internet internal` → `inter` (All three begin with "inter"; the next letters are v, n, n, so the prefix stops there.)  
**Example.** `cat dog` → `-` (No shared first letter.)  
**Hints.** Start with the first word as a candidate prefix. / Shorten the candidate until each next word starts with it.  
**Approach.** Take the first word as the prefix and for every other word trim the prefix until the word starts with it. If it becomes empty, print "-". (O(total characters) time, O(1) extra space)  
**Edge cases.** single word; one word is a prefix of another; no common prefix

### Secret shift note
`dc-a-secret-shift` · easy · 20 min

Encrypt a message by shifting every letter forward by k places in the alphabet, wrapping from z back to a. Upper-case letters stay upper-case, and non-letters are left untouched.

**Input.** Line 1: the message; line 2: the integer k.  
**Output.** The encrypted message.  
**Constraints.** 1 ≤ length ≤ 10^5; 0 ≤ k ≤ 10^9  
**Example.** `Hello, World
3` → `Khoor, Zruog` (H→K, e→h, ... and the comma and space remain.)  
**Example.** `xyz
2` → `zab` (x→z, y wraps to a, z wraps to b.)  
**Hints.** Convert a letter to 0..25, add k, take modulo 26. / Handle upper and lower case with different base characters.  
**Approach.** For each letter, subtract the base code (A or a), add k modulo 26, and add the base back. Copy other characters unchanged. (O(n) time, O(n) output)  
**Edge cases.** k multiple of 26; no letters; mixed case

### Spun label
`dc-a-spun-label` · easy · 20 min

A label is spun by moving some number of characters from the front to the back (a rotation). Given two strings, decide whether the second could be a spun version of the first (including zero spins).

**Input.** Two lines, one string each.  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `waterbottle
erbottlewat` → `true` (Move "wat" from the front to the back.)  
**Example.** `abcd
acbd` → `false` (Same letters but not a rotation.)  
**Hints.** A rotation must have the same length. / Every rotation of A appears as a substring of A+A.  
**Approach.** If lengths differ answer false. Otherwise check whether B occurs inside A concatenated with itself. (O(n) time with a linear-time substring search (O(n^2) naive is fine for small n), O(n) space)  
**Edge cases.** different lengths; identical strings; length 1

### Add the binary bills
`dc-a-binary-bill` · easy · 25 min

Two non-negative numbers are written as binary strings (no leading zeros except the number 0 itself). Add them by hand, digit by digit with a carry, and print the sum as a binary string. The numbers can be too long for built-in integer types.

**Input.** Two lines, each a binary string.  
**Output.** The sum in binary.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `1011
110` → `10001` (11 + 6 = 17, which is 10001.)  
**Example.** `0
0` → `0` (Zero plus zero is 0.)  
**Hints.** Walk both strings from the right with a carry. / Append the leftover carry at the end, then reverse.  
**Approach.** Two pointers start at the last digits. Sum the digits and carry, record sum%2, carry = sum//2, continue until both strings and the carry are done, then reverse the result. (O(max(n,m)) time, O(max(n,m)) space)  
**Edge cases.** carry creates a new leading digit; different lengths; both zero

### Spreadsheet column number
`dc-a-sheet-column-number` · easy · 20 min

Spreadsheet columns are named A, B, ..., Z, AA, AB, ..., AZ, BA, ... Given a column name made of upper-case letters, print its 1-based column number.

**Input.** One string of capital letters.  
**Output.** One integer.  
**Constraints.** 1 ≤ length ≤ 7  
**Example.** `AB` → `28` (A=1, B=2; AB = 1*26 + 2 = 28.)  
**Example.** `ZZ` → `702` (ZZ = 26*26 + 26 = 702.)  
**Hints.** This is like base 26 but letters map to 1..26 instead of 0..25. / Fold left to right: value = value*26 + letter.  
**Approach.** Process letters left to right, updating value = value*26 + (letter - 64). The result is the column number. (O(n) time, O(1) extra space)  
**Edge cases.** single letter; all Z; length 7

## trees

### Tallest branch
`dc-b-tallest-branch` · easy · 25 min

A family tree is stored as a binary tree. Count the number of nodes on the longest path from the root down to a leaf.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** A single integer, the maximum depth.  
**Constraints.** 0 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 null null 5 6` → `4` (The path 1-2-4-6 has four nodes.)  
**Example.** `7` → `1` (A lone root has depth 1.)  
**Hints.** Think recursively: how does a node's height relate to its children's? / depth(node) = 1 + max(depth(left), depth(right)), and an empty tree has depth 0.  
**Approach.** Recursively compute 1 + max of the children's depths, returning 0 for a missing node. A BFS counting levels works equally well. (O(n) time, O(h) stack space)  
**Edge cases.** Single node; Left-leaning chain; Empty tree

### Floor by floor
`dc-b-floor-by-floor` · easy · 25 min

Print the nodes of a binary tree level by level, from the root downwards and left to right within each level. Separate levels with ' | '.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** Levels on one line, levels separated by ' | ', values by spaces.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 null null 5` → `1 | 2 3 | 4 5` (Level 0: 1; level 1: 2 3; level 2: 4 5.)  
**Example.** `8 null 9 null 10` → `8 | 9 | 10` (A right-leaning chain: one node per level.)  
**Hints.** Process all nodes of one depth before moving on. / Use a queue; for each level, take the current queue size and process exactly that many nodes.  
**Approach.** BFS with a queue. At each round remember the queue length, pop that many nodes into the level's list, and enqueue their children. (O(n) time, O(w) space (w = max width))  
**Edge cases.** Single node; Chain; Perfect tree

### Mirror-image tree
`dc-b-mirror-tree` · easy · 25 min

Decide whether a binary tree is symmetric around its centre: the left subtree must be the mirror image of the right subtree, in both shape and values. Decide whether the given tree is symmetric.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** true or false.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 2 3 4 4 3` → `true` (Left subtree 2(3,4) mirrors right subtree 2(4,3).)  
**Example.** `1 2 2 null 3 null 3` → `false` (Both children have only a right child, which is not a mirror.)  
**Hints.** Compare two subtrees at once rather than one. / isMirror(a,b): both empty is true; values equal and isMirror(a.left,b.right) and isMirror(a.right,b.left).  
**Approach.** Recursively test a pair of nodes: both null is true, one null is false, otherwise values must match and the outer pair and inner pair must also mirror. Start with the root's two children. (O(n) time, O(h) space)  
**Edge cases.** Single node; Different shapes; Equal values but asymmetric structure

### Flip the tree
`dc-b-flip-tree` · easy · 25 min

Swap the left and right children of every node in a binary tree, producing its mirror image. Print the flipped tree in the same level-order format.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** The flipped tree in level-order with null markers (trailing nulls omitted).  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `1 2 3 4 5` → `1 3 2 null null 5 4` (Root children swap to 3 2, and 2's children swap to 5 4: 1 3 2 null null 5 4.)  
**Example.** `5 null 8 7` → `5 8 null null 7` (The right child 8 (with left child 7) moves to the left, and 7 becomes a right child.)  
**Hints.** Every node does the same small job. / Recurse into both children, then swap them (or swap first, then recurse).  
**Approach.** Do a DFS; at each node swap its two children and recurse into both. A BFS with a queue gives the same result. (O(n) time, O(h) space)  
**Edge cases.** Single node; Only left children; Only right children

### Trail total
`dc-b-trail-total` · easy · 25 min

Each node of a binary tree holds a toll. Determine whether some path that starts at the root and ends at a leaf has tolls adding up exactly to a target value.

**Input.** Line 1: the tree in level-order with null. Line 2: the target integer.  
**Output.** true or false.  
**Constraints.** 0 ≤ n ≤ 10^4; values may be negative  
**Example.** `10 5 12 3 7
18` → `true` (Path 10-5-3 sums to 18.)  
**Example.** `10 5 12 3 7
20` → `false` (Root-to-leaf sums are 18, 22 and 22, so 20 is impossible.)  
**Hints.** Subtract each node's value from the target as you go down. / At a leaf, check whether the remaining target equals the leaf's value.  
**Approach.** DFS with a remaining target. At a leaf, return remaining == value. Otherwise return true if either child can reach target - value. (O(n) time, O(h) space)  
**Edge cases.** Empty tree is false; Path must end at a leaf, not any node; Negative values

### Right edge view
`dc-b-right-edge-view` · easy · 25 min

Stand to the right of a binary tree and look at it. List, from top to bottom, the value of the node you see at each depth - the rightmost node of every level.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** The visible values from top to bottom.  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `6 2 8 1 4 null 9 null null 3` → `6 8 9 3` (Levels are [6],[2,8],[1,4,9],[3]; the rightmost are 6 8 9 3.)  
**Example.** `1 2 null 3` → `1 2 3` (A left chain is fully visible: 1 2 3.)  
**Hints.** Each level contributes one value. / Do a level-order traversal and keep the last node of each level.  
**Approach.** BFS by levels, recording the last node processed at each level. DFS visiting right children first and recording the first node seen at each new depth also works. (O(n) time, O(w) space)  
**Edge cases.** Single node; Left-only chain; Deeper left branch hidden shows up lower

### Left leaf sum
`dc-b-left-leaf-sum` · easy · 25 min

In a binary tree, a left leaf is a node with no children that is the left child of its parent. Add up the values of all left leaves.

**Input.** One line giving a binary tree in level-order, with null for missing children (children of missing nodes are not listed).  
**Output.** The sum of left-leaf values (0 if none).  
**Constraints.** 1 ≤ n ≤ 10^4  
**Example.** `10 4 6 2 null 5 8` → `7` (Left leaves are 2 (child of 4) and 5 (child of 6): total 7.)  
**Example.** `1` → `0` (The root is not a left child, so 0.)  
**Hints.** You need to know how a node relates to its parent. / Pass a flag isLeft down the recursion; add the value when a leaf has the flag set.  
**Approach.** DFS with a boolean telling whether the node is a left child. A leaf with the flag adds its value; internal nodes sum the results from their children. (O(n) time, O(h) space)  
**Edge cases.** Single node; Leaf that is a right child; Only right children

### Twin trees
`dc-b-twin-trees` · easy · 25 min

Two binary trees are twins if they have exactly the same shape and the same value in every matching position. Decide whether the two given trees are twins.

**Input.** Two lines, each a binary tree in level-order with null.  
**Output.** true or false.  
**Constraints.** 0 ≤ n ≤ 10^4  
**Example.** `1 2 3
1 2 3` → `true` (Same shape and values.)  
**Example.** `1 2
1 null 2` → `false` (The same values but 2 is a left child in one and a right child in the other.)  
**Hints.** Compare the two trees node by node in the same position. / same(a,b): both null true; one null false; equal values and same(a.left,b.left) and same(a.right,b.right).  
**Approach.** Recurse in lockstep on both trees. A mismatch in presence or value returns false; otherwise both subtree pairs must match. (O(min(n,m)) time, O(h) space)  
**Edge cases.** Both empty; One empty; Same values, different structure

## two-pointers

### Biggest pond between walls
`dc-a-biggest-pond` · easy · 30 min

Vertical walls stand at positions 0..n-1 with the given heights. Pick two walls and fill the space between them with water; the water level is limited by the shorter wall, and the amount is that height times the distance between the walls (ignore any walls in between). Print the largest amount possible.

**Input.** One line of n wall heights.  
**Output.** One integer.  
**Constraints.** 2 ≤ n ≤ 10^5; 0 ≤ height ≤ 10^4  
**Example.** `3 9 2 7 4` → `14` (Walls 9 and 7 at distance 2: min(9,7)*2 = 14.)  
**Example.** `5 5` → `5` (Only one pair: 5 * 1.)  
**Hints.** Start with the widest pair of walls. / Move the pointer at the shorter wall inwards; moving the taller one cannot help.  
**Approach.** Use two pointers at both ends, computing min(height)*distance each time and then advancing the pointer at the shorter wall, since only a taller wall could improve the area. (O(n) time, O(1) extra space)  
**Edge cases.** n = 2; all zeros; strictly increasing heights

### Mirror with one typo
`dc-a-one-typo-mirror` · easy · 30 min

A word is nearly a mirror if it is a palindrome, or becomes one after deleting at most one character. Decide whether the given word is nearly a mirror.

**Input.** One lowercase string.  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `abca` → `true` (Deleting c (or b) gives aba (or aca).)  
**Example.** `abcd` → `false` (No single deletion makes it symmetric.)  
**Hints.** Walk inwards from both ends until a mismatch. / At the mismatch try skipping the left or the right character and check that the remainder is a palindrome.  
**Approach.** Move two pointers inward. On the first mismatch, check whether the substring skipping the left char or the one skipping the right char is a palindrome; if neither, the answer is false. (O(n) time, O(1) extra space)  
**Edge cases.** already a palindrome; length 1; mismatch at the ends

### Square the readings
`dc-a-square-the-readings` · easy · 20 min

A sensor logs n readings in non-decreasing order, some negative. Print the squares of the readings in non-decreasing order, without simply squaring and sorting from scratch.

**Input.** One line of n sorted integers.  
**Output.** The sorted squares.  
**Constraints.** 1 ≤ n ≤ 10^5; |values| ≤ 10^4  
**Example.** `-6 -2 1 3 5` → `1 4 9 25 36` (Squares 36 4 1 9 25 sorted.)  
**Example.** `2 3` → `4 9` (Already non-negative.)  
**Hints.** The largest square is at one of the two ends. / Fill the output from the back, taking the larger absolute value of the two ends each time.  
**Approach.** Place pointers at both ends. The larger absolute value yields the largest remaining square; write it at the end of the output and move that pointer inward. (O(n) time, O(n) space)  
**Edge cases.** all negative; all positive; contains zero

### Three-flag sort
`dc-a-three-flag-sort` · easy · 25 min

A row of flags is coloured 0 (red), 1 (white) or 2 (blue). Reorder them so all 0s come first, then all 1s, then all 2s, in a single pass and without counting or a library sort.

**Input.** One line of n values from {0,1,2}.  
**Output.** The reordered row.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `2 0 2 1 1 0` → `0 0 1 1 2 2` (Two 0s, two 1s, two 2s in order.)  
**Example.** `1 1` → `1 1` (Already uniform.)  
**Hints.** Keep three regions: zeros at the front, twos at the back, unknown in the middle. / Swap a 0 to the front pointer, a 2 to the back pointer, and just advance on a 1.  
**Approach.** Use pointers lo, mid, hi. If a[mid] is 0 swap with lo and advance both; if 1 advance mid; if 2 swap with hi and shrink hi (do not advance mid). (O(n) time, O(1) extra space)  
**Edge cases.** single element; no 1s; already sorted

### Cheap duos
`dc-a-cheap-duos` · easy · 30 min

A shop sells n items. A duo is a pair of different items; count the duos whose total price is strictly less than a given budget. The input order is arbitrary.

**Input.** Line 1: n prices; line 2: the budget.  
**Output.** One integer.  
**Constraints.** 2 ≤ n ≤ 10^5; |values| ≤ 10^9  
**Example.** `1 3 5 7
8` → `2` ((1,3) and (1,5); (1,7) equals 8 which is not less.)  
**Example.** `-2 0 4
1` → `1` (Only (-2,0) has total below 1.)  
**Hints.** Sort the prices first. / If a[l]+a[r] < budget, then a[l] pairs with every element from l+1 to r.  
**Approach.** Sort, then use pointers l and r. When a[l]+a[r] is under the budget, add r-l pairs and advance l; otherwise decrement r. (O(n log n) time, O(1) extra space)  
**Edge cases.** no valid pair; all valid pairs; duplicates

### Hidden word
`dc-a-hidden-word` · easy · 20 min

A word is hidden in a longer text if you can find all its letters in the text in the same order, though not necessarily next to each other. Decide whether the first string is hidden in the second.

**Input.** Line 1: the word; line 2: the text.  
**Output.** "true" or "false".  
**Constraints.** 1 ≤ lengths ≤ 10^5  
**Example.** `ace
abcde` → `true` (a, c, e appear in order in abcde.)  
**Example.** `aec
abcde` → `false` (After a and e, no c remains.)  
**Hints.** Use one pointer on the word and one on the text. / Advance the word pointer only when letters match.  
**Approach.** Scan the text; each time the current text letter equals the next needed letter of the word, advance the word pointer. The word is hidden if the pointer reaches its end. (O(n) time, O(1) extra space)  
**Edge cases.** word equals text; word longer than text; repeated letters

### Mirror the vowels
`dc-a-vowel-mirror` · easy · 20 min

In a word, keep every consonant where it is, but reverse the order of the vowels (a, e, i, o, u, in either case). Print the new word; letter case moves with each letter.

**Input.** One word of letters.  
**Output.** The transformed word.  
**Constraints.** 1 ≤ length ≤ 10^5  
**Example.** `hello` → `holle` (The vowels e and o swap.)  
**Example.** `Algorithm` → `ilgorAthm` (Vowels A, o, i become i, o, A in their slots.)  
**Hints.** Use pointers from both ends, each hunting for the next vowel. / Swap when both stand on vowels.  
**Approach.** Two pointers move inward, skipping non-vowels; when both point at vowels, swap them and move both. Stop when they cross. (O(n) time, O(n) space for a char array)  
**Edge cases.** no vowels; all vowels; uppercase vowels

### Longest hill
`dc-a-longest-hill` · easy · 30 min

A hill in a list of altitudes is a stretch of at least 3 values that strictly rises to a single peak and then strictly falls. Print the length of the longest hill, or 0 if there is none.

**Input.** One line of n altitudes.  
**Output.** One integer.  
**Constraints.** 1 ≤ n ≤ 10^5  
**Example.** `2 1 4 7 3 2 5` → `5` (1 4 7 3 2 rises then falls.)  
**Example.** `1 2 3` → `0` (Only rising, no fall.)  
**Hints.** Find each peak (greater than both neighbours). / From each peak extend left while rising and right while falling.  
**Approach.** For each index that is a strict peak, expand left while values strictly decrease going left and right while they strictly decrease going right. The hill length is right - left + 1; skip ahead past the right end. (O(n) time, O(1) extra space)  
**Edge cases.** plateau; strictly decreasing; n < 3

## union-find

### How many work crews
`dc-c-count-crews` · easy · 20 min

A site has n workers. Each statement a b says workers a and b are on the same crew, and crew membership is transitive. After reading all statements, how many distinct crews are there? A worker never mentioned forms a crew alone.

**Input.** First line n k, then k lines each with a statement a b.  
**Output.** One integer: the number of crews.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ k ≤ 2·10^5  
**Example.** `5 2
1 2
3 4` → `3` (Crews are {1,2}, {3,4} and {5}.)  
**Example.** `3 3
1 2
2 3
1 3` → `1` (Everyone is in one crew; the last statement adds nothing.)  
**Hints.** Start with n separate groups and merge on every statement. / A union-find structure tracks the group count cheaply.  
**Approach.** Initialize a disjoint-set forest with n singleton sets and a counter n. Each successful union of two different roots decrements the counter. (O((n + k) α(n)) time, O(n) space)  
**Edge cases.** No statements; Repeated statements; A statement linking a worker to themselves

### Are they on the same crew
`dc-c-same-crew-check` · easy · 25 min

Workers 1..n start on separate crews. You receive a mixed list of operations: U a b merges the crews of a and b, and Q a b asks whether a and b are currently on the same crew. Answer every query at the moment it is asked.

**Input.** First line n q, then q lines each starting with U or Q followed by two worker numbers.  
**Output.** One line YES or NO for each Q, in order.  
**Constraints.** 1 ≤ n, q ≤ 10^5  
**Example.** `4 5
Q 1 2
U 1 2
Q 1 2
U 3 2
Q 1 3` → `NO
YES
YES` (Queries: no, yes, then 1 and 3 joined through 2.)  
**Example.** `2 2
Q 1 1
Q 1 2` → `YES
NO` (A worker is always with themselves; 1 and 2 are never merged.)  
**Hints.** Compare the representatives of both workers. / Use path compression to keep find fast.  
**Approach.** Use union-find: U performs union, Q compares find(a) and find(b). Path compression plus union by size makes each operation near constant time. (O(q α(n)) time, O(n) space)  
**Edge cases.** Query a worker with themselves; Query before any union; Union already-merged workers

### Size of the biggest crew
`dc-c-biggest-crew` · easy · 20 min

People at a festival form groups through introductions: an introduction a b puts a and b in the same group, and groups merge transitively. After all introductions, how many people are in the largest group?

**Input.** First line n m, then m lines each with an introduction a b.  
**Output.** One integer: the size of the largest group.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `6 3
1 2
2 3
5 6` → `3` (Group {1,2,3} has three people.)  
**Example.** `3 0` → `1` (Everyone alone, largest group is 1.)  
**Hints.** Keep a size counter for each set root. / When merging, add the size of the absorbed set.  
**Approach.** Maintain size[root] in a union-find. After all unions, take the maximum size over roots. (O((n + m) α(n)) time, O(n) space)  
**Edge cases.** No introductions; Everyone in one group; Repeated introduction

### The cable that closes a loop
`dc-c-first-loop-cable` · easy · 25 min

Cables are laid one at a time between n posts. A cable is redundant if its two posts were already linked, directly or indirectly, by earlier cables. Print the first redundant cable as its two posts, or NONE if every cable added a new connection.

**Input.** First line n m, then m lines each with a cable a b in the order laid.  
**Output.** The first redundant cable as 'a b', or NONE.  
**Constraints.** 2 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `4 4
1 2
2 3
3 4
4 1` → `4 1` (The fourth cable joins posts already connected.)  
**Example.** `4 2
1 2
3 4` → `NONE` (Both cables join new components.)  
**Hints.** Process in the given order; stop at the first problem. / Union returns false when both ends already share a root.  
**Approach.** Run union-find over cables in order. The first union that finds equal roots is the answer; otherwise print NONE. (O(m α(n)) time, O(n) space)  
**Edge cases.** Duplicate cable as the first redundant one; No redundant cable; Self-loop cable

### Groups after every merge
`dc-c-groups-over-time` · easy · 25 min

n islands start disconnected. Bridges are built one by one, and a bridge a b joins the land masses of a and b. After each bridge, report how many separate land masses remain.

**Input.** First line n m, then m lines each with a bridge a b in construction order.  
**Output.** m space-separated integers: the land-mass count after each bridge.  
**Constraints.** 1 ≤ n ≤ 10^5; 1 ≤ m ≤ 2·10^5  
**Example.** `4 3
1 2
3 4
2 3` → `3 2 1` (Counts go 3, then 2, then 1.)  
**Example.** `3 3
1 2
2 1
1 2` → `2 2 2` (Repeated bridges do not reduce the count again.)  
**Hints.** The count only changes when a union actually merges two sets. / Record the counter after each edge.  
**Approach.** Union-find with a component counter; append the counter to the result after processing each bridge. (O(m α(n)) time, O(n + m) space)  
**Edge cases.** Bridge between already connected islands; Self-bridge; Single island

### Moving spare cables
`dc-c-spare-cables` · easy · 25 min

A lab has n computers and m existing cables, each joining two computers. You may unplug any cable and replug it between any two computers. Find the minimum number of replugs needed to make all computers connected, or -1 if there are too few cables for that to be possible.

**Input.** First line n m, then m lines each with a cable a b.  
**Output.** The minimum number of moves, or -1.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `4 3
1 2
1 2
3 4` → `1` (Components {1,2},{3,4}; the duplicate cable can be moved once.)  
**Example.** `5 2
1 2
3 4` → `-1` (Four cables are required for five computers but only two exist.)  
**Hints.** To connect c components you need c-1 new links. / If m < n-1 it can never be connected.  
**Approach.** Count components with union-find. If m < n-1 return -1; otherwise return components - 1, since surplus cables always exist to be moved. (O((n + m) α(n)) time, O(n) space)  
**Edge cases.** Already connected (0); m = n-1 but disconnected; n = 1

### Circles from a matrix
`dc-c-friend-matrix` · easy · 20 min

n people are described by an n by n table where entry (i,j) is 1 if person i knows person j directly. Knowing is symmetric and a circle contains everyone linked through chains of acquaintances. Count the circles.

**Input.** First line n, then n lines of n space-separated 0/1 values.  
**Output.** One integer: the number of circles.  
**Constraints.** 1 ≤ n ≤ 500  
**Example.** `3
1 1 0
1 1 0
0 0 1` → `2` (Persons 1 and 2 form a circle; 3 is alone.)  
**Example.** `3
1 0 0
0 1 0
0 0 1` → `3` (Only the diagonal is set, so three circles.)  
**Hints.** Every 1 off the diagonal is an edge. / Union i and j for each such entry.  
**Approach.** Scan the matrix, union (i,j) whenever the entry is 1, and report the number of remaining sets. (O(n² α(n)) time, O(n) space)  
**Edge cases.** n = 1; All ones; Only the diagonal set

### Label each cluster by its smallest member
`dc-c-component-leader` · easy · 25 min

Towns 1..n are linked by m two-way roads. Give each town the label of its region: the smallest town number in the set of towns reachable from it. Print the label of every town.

**Input.** First line n m, then m lines each with a road a b.  
**Output.** n space-separated labels, one per town in order.  
**Constraints.** 1 ≤ n ≤ 10^5; 0 ≤ m ≤ 2·10^5  
**Example.** `5 3
2 3
3 5
1 4` → `1 2 2 1 2` (Regions {1,4} and {2,3,5}.)  
**Example.** `3 0` → `1 2 3` (Each town is its own region.)  
**Hints.** Union-find roots are arbitrary; keep your own minimum per root. / Or always union so the smaller index becomes the root.  
**Approach.** Build a union-find, then compute the smallest index for each root in one pass and map each node to its root's minimum. (O((n + m) α(n)) time, O(n) space)  
**Edge cases.** No roads; Chain in decreasing order; One big region
