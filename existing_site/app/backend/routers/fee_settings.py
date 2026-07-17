import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.fee_settings import Fee_settingsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/fee_settings", tags=["fee_settings"])


# ---------- Pydantic Schemas ----------
class Fee_settingsData(BaseModel):
    """Entity data schema (for create/update)"""
    pair_id: int
    fee_amount: float
    fee_percentage: float = None
    fee_currency: str
    deposit_currency: str = None


class Fee_settingsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    pair_id: Optional[int] = None
    fee_amount: Optional[float] = None
    fee_percentage: Optional[float] = None
    fee_currency: Optional[str] = None
    deposit_currency: Optional[str] = None


class Fee_settingsResponse(BaseModel):
    """Entity response schema"""
    id: int
    pair_id: int
    fee_amount: float
    fee_percentage: Optional[float] = None
    fee_currency: str
    deposit_currency: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Fee_settingsListResponse(BaseModel):
    """List response schema"""
    items: List[Fee_settingsResponse]
    total: int
    skip: int
    limit: int


class Fee_settingsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Fee_settingsData]


class Fee_settingsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Fee_settingsUpdateData


class Fee_settingsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Fee_settingsBatchUpdateItem]


class Fee_settingsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Fee_settingsListResponse)
async def query_fee_settingss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query fee_settingss with filtering, sorting, and pagination"""
    logger.debug(f"Querying fee_settingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Fee_settingsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} fee_settingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying fee_settingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Fee_settingsListResponse)
async def query_fee_settingss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query fee_settingss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying fee_settingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Fee_settingsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} fee_settingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying fee_settingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Fee_settingsResponse)
async def get_fee_settings(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single fee_settings by ID"""
    logger.debug(f"Fetching fee_settings with id: {id}, fields={fields}")
    
    service = Fee_settingsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Fee_settings with id {id} not found")
            raise HTTPException(status_code=404, detail="Fee_settings not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching fee_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Fee_settingsResponse, status_code=201)
async def create_fee_settings(
    data: Fee_settingsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new fee_settings"""
    logger.debug(f"Creating new fee_settings with data: {data}")
    
    service = Fee_settingsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create fee_settings")
        
        logger.info(f"Fee_settings created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating fee_settings: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating fee_settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Fee_settingsResponse], status_code=201)
async def create_fee_settingss_batch(
    request: Fee_settingsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple fee_settingss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} fee_settingss")
    
    service = Fee_settingsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} fee_settingss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Fee_settingsResponse])
async def update_fee_settingss_batch(
    request: Fee_settingsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple fee_settingss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} fee_settingss")
    
    service = Fee_settingsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} fee_settingss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Fee_settingsResponse)
async def update_fee_settings(
    id: int,
    data: Fee_settingsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing fee_settings"""
    logger.debug(f"Updating fee_settings {id} with data: {data}")

    service = Fee_settingsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Fee_settings with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Fee_settings not found")
        
        logger.info(f"Fee_settings {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating fee_settings {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating fee_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_fee_settingss_batch(
    request: Fee_settingsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple fee_settingss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} fee_settingss")
    
    service = Fee_settingsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} fee_settingss successfully")
        return {"message": f"Successfully deleted {deleted_count} fee_settingss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_fee_settings(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single fee_settings by ID"""
    logger.debug(f"Deleting fee_settings with id: {id}")
    
    service = Fee_settingsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Fee_settings with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Fee_settings not found")
        
        logger.info(f"Fee_settings {id} deleted successfully")
        return {"message": "Fee_settings deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fee_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")