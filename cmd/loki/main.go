package main

import (
	"fmt"

	"github.com/hashicorp/go-uuid"
)

func main() {

	uid, err := uuid.GenerateUUID()
	if err != nil {
		fmt.Println("Error generating a UUID")
	}
	fmt.Println("This is not really Loki, just meant to look like it. Here's a UUID: ", uid)
}
