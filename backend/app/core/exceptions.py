from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        self.code = code
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message},
        )


class NotFoundException(AppException):
    def __init__(self, code: str = "NOT_FOUND", message: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, code, message)


class ConflictException(AppException):
    def __init__(self, code: str = "CONFLICT", message: str = "Resource conflict"):
        super().__init__(status.HTTP_409_CONFLICT, code, message)


class ForbiddenException(AppException):
    def __init__(self, code: str = "FORBIDDEN", message: str = "Access denied"):
        super().__init__(status.HTTP_403_FORBIDDEN, code, message)


class BadRequestException(AppException):
    def __init__(self, code: str = "BAD_REQUEST", message: str = "Invalid request"):
        super().__init__(status.HTTP_400_BAD_REQUEST, code, message)


class UnauthorizedException(AppException):
    def __init__(self, code: str = "UNAUTHORIZED", message: str = "Authentication required"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, code, message)
