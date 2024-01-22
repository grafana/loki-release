package main

import (
	"fmt"

	"github.com/hashicorp/go-uuid"
)

func main() {

	uid, err := uuid.GenerateUUID()
	if err != nil {
		fmt.Println("Error generating UUID")
	}
	fmt.Println("This is not really a go program, just meant to look like one. Here's a UUID: ", uid)
}
