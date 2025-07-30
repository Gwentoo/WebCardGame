package utils

import "math/rand"

func WeightedRandomChoice(pack map[string]int) string {

	totalWeight := 0
	for _, weight := range pack {
		totalWeight += weight
	}

	if totalWeight == 0 {
		return ""
	}

	r := rand.Intn(totalWeight)

	current := 0
	for name, weight := range pack {
		current += weight
		if r < current {
			return name
		}
	}

	return ""
}
