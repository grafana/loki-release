package main

import (
	"testing"

	"github.com/hashicorp/go-uuid"
	"github.com/stretchr/testify/require"
)

func Test_Main(t *testing.T) {
	t.Run("Test main", func(t *testing.T) {
		require.True(t, true)

		uid, err := uuid.GenerateUUID()
		require.NoError(t, err)
		require.NotEmpty(t, uid)
	})
}
