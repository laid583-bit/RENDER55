import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.currency_pairs import Currency_pairs

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Currency_pairsService:
    """Service layer for Currency_pairs operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Currency_pairs]:
        """Create a new currency_pairs"""
        try:
            obj = Currency_pairs(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created currency_pairs with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating currency_pairs: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Currency_pairs]:
        """Get currency_pairs by ID"""
        try:
            query = select(Currency_pairs).where(Currency_pairs.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching currency_pairs {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of currency_pairss"""
        try:
            query = select(Currency_pairs)
            count_query = select(func.count(Currency_pairs.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Currency_pairs, field):
                        query = query.where(getattr(Currency_pairs, field) == value)
                        count_query = count_query.where(getattr(Currency_pairs, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Currency_pairs, field_name):
                        query = query.order_by(getattr(Currency_pairs, field_name).desc())
                else:
                    if hasattr(Currency_pairs, sort):
                        query = query.order_by(getattr(Currency_pairs, sort))
            else:
                query = query.order_by(Currency_pairs.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching currency_pairs list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Currency_pairs]:
        """Update currency_pairs"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Currency_pairs {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated currency_pairs {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating currency_pairs {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete currency_pairs"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Currency_pairs {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted currency_pairs {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting currency_pairs {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Currency_pairs]:
        """Get currency_pairs by any field"""
        try:
            if not hasattr(Currency_pairs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Currency_pairs")
            result = await self.db.execute(
                select(Currency_pairs).where(getattr(Currency_pairs, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching currency_pairs by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Currency_pairs]:
        """Get list of currency_pairss filtered by field"""
        try:
            if not hasattr(Currency_pairs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Currency_pairs")
            result = await self.db.execute(
                select(Currency_pairs)
                .where(getattr(Currency_pairs, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Currency_pairs.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching currency_pairss by {field_name}: {str(e)}")
            raise