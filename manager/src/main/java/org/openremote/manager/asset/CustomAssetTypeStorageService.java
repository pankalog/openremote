/*
 * Copyright 2016, OpenRemote Inc.
 *
 * See the CONTRIBUTORS.txt file in the distribution for a
 * full listing of individual contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.openremote.manager.asset;

import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import org.apache.camel.builder.RouteBuilder;
import org.openremote.container.persistence.PersistenceService;
import org.openremote.model.Container;
import org.openremote.model.ContainerService;
import org.openremote.model.CustomAssetModelProvider;
import org.openremote.model.asset.AssetDescriptor;
import org.openremote.model.asset.CustomAssetType;

import java.util.Arrays;

public class CustomAssetTypeStorageService extends RouteBuilder implements ContainerService, CustomAssetModelProvider {

    protected static PersistenceService persistenceService;

    @Override
    public void configure() throws Exception {
    }

    @Override
    public void init(Container container) throws Exception {
        persistenceService = container.getService(PersistenceService.class);
    }

    @Override
    public void start(Container container) throws Exception {
    }

    @Override
    public void stop(Container container) throws Exception {
    }

    @SuppressWarnings("java:S2326")
    protected <T extends CustomAssetType> CustomAssetType get(String id) {
        return persistenceService.doReturningTransaction(em -> em.find( CustomAssetType.class, id));
    }

    @SuppressWarnings("java:S2326")
    protected <T extends CustomAssetType> CustomAssetType[] findAll() {
        return persistenceService.doReturningTransaction(em -> {
            try {
                CriteriaBuilder cb = em.getCriteriaBuilder();
                CriteriaQuery<CustomAssetType> cq = cb.createQuery(CustomAssetType.class);
                Root<CustomAssetType> root = cq.from(CustomAssetType.class);
                CriteriaQuery<CustomAssetType> all = cq.select(root);
                TypedQuery<CustomAssetType> allQuery = em.createQuery(all);
                return allQuery.getResultList().toArray(new CustomAssetType[0]);
            } catch (Exception e) {
                e.printStackTrace();
            }
            return new CustomAssetType[0]; // Empty array if nothing found.
        });
    }

    @Override
    public AssetDescriptor<?>[] getAssetDescriptors() {
        if (persistenceService == null) {
            return new AssetDescriptor[0];
        }
        AssetDescriptor<?>[] result = Arrays.stream(findAll()).map(CustomAssetType::getAssetDescriptor).toArray(AssetDescriptor<?>[]::new);
        return result;
    }
}
