// Copyright 2022 Harness Inc. All rights reserved.
// Use of this source code is governed by the Polyform Free Trial License
// that can be found in the LICENSE.md file for this repository.

package usererror

import (
	"errors"
	"net/http"

	"github.com/harness/gitness/gitrpc"
	apiauth "github.com/harness/gitness/internal/api/auth"
	"github.com/harness/gitness/internal/services/webhook"
	"github.com/harness/gitness/internal/store"
	"github.com/harness/gitness/types/check"

	"github.com/rs/zerolog/log"
)

func Translate(err error) *Error {
	var rError *Error
	var checkError *check.ValidationError
	switch {
	// api errors
	case errors.As(err, &rError):
		return rError

	// api auth errors
	case errors.Is(err, apiauth.ErrNotAuthenticated):
		return ErrUnauthorized
	case errors.Is(err, apiauth.ErrNotAuthorized):
		return ErrForbidden

	// validation errors
	case errors.As(err, &checkError):
		return New(http.StatusBadRequest, checkError.Error())

	// store errors
	case errors.Is(err, store.ErrResourceNotFound):
		return ErrNotFound
	case errors.Is(err, store.ErrDuplicate):
		return ErrDuplicate
	case errors.Is(err, store.ErrPrimaryPathCantBeDeleted):
		return ErrPrimaryPathCantBeDeleted
	case errors.Is(err, store.ErrPathTooLong):
		return ErrPathTooLong
	case errors.Is(err, store.ErrNoChangeInRequestedMove):
		return ErrNoChange
	case errors.Is(err, store.ErrIllegalMoveCyclicHierarchy):
		return ErrCyclicHierarchy
	case errors.Is(err, store.ErrSpaceWithChildsCantBeDeleted):
		return ErrSpaceWithChildsCantBeDeleted

	// gitrpc errors
	case errors.Is(err, gitrpc.ErrAlreadyExists):
		return ErrDuplicate
	case errors.Is(err, gitrpc.ErrInvalidArgument):
		return ErrBadRequest
	case errors.Is(err, gitrpc.ErrNotFound):
		return ErrNotFound
	case errors.Is(err, gitrpc.ErrPreconditionFailed):
		return ErrPreconditionFailed
	case errors.Is(err, gitrpc.ErrNotMergeable):
		return ErrNotMergeable

	// webhook errors
	case errors.Is(err, webhook.ErrWebhookNotRetriggerable):
		return ErrWebhookNotRetriggerable

	// unknown error
	default:
		log.Warn().Msgf("Unable to translate error: %s", err)
		return ErrInternal
	}
}
