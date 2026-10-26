import hashlib
import hmac
from django.contrib.auth.hashers import BasePasswordHasher, mask_hash

class LegacyScryptHasher(BasePasswordHasher):
    algorithm = 'legacy_scrypt'
    def encode(self, password, salt):
        digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex()
        return f'{self.algorithm}$'+salt+'$'+digest
    def verify(self, password, encoded):
        try:
            algorithm, salt, digest = encoded.split('$')
            return hmac.compare_digest(self.encode(password, salt), encoded)
        except (ValueError, TypeError):
            return False
    def safe_summary(self, encoded):
        algorithm, salt, digest = encoded.split('$')
        return {'algorithm':algorithm, 'salt':mask_hash(salt), 'hash':mask_hash(digest)}
    def must_update(self, encoded):
        return True
