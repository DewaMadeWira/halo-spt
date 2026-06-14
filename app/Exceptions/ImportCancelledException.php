<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown from inside an import when the user requests a stop. The processing job
 * catches it to land the import in "cancelled" (rather than "failed") and does
 * not re-throw, so the queue treats the job as completed.
 */
class ImportCancelledException extends RuntimeException
{
}
