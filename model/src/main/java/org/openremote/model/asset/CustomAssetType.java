/*
 * Copyright 2017, OpenRemote Inc.
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
package org.openremote.model.asset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.openremote.model.IdentifiableEntity;
import org.openremote.model.asset.impl.CustomAsset;
import org.openremote.model.asset.impl.UnknownAsset;

import static org.openremote.model.Constants.PERSISTENCE_UNIQUE_ID_GENERATOR;

@Entity
@Table(name = "CUSTOM_ASSET_TYPE")
public class CustomAssetType<T extends CustomAssetType<?>> implements IdentifiableEntity<T> {

    @Id
    @Column(name = "ID", length = 22, columnDefinition = "char(22)")
    @GeneratedValue(generator = PERSISTENCE_UNIQUE_ID_GENERATOR)
    protected String id;

    @Column(name = "NAME", nullable = false)
    protected String name;

    @Column(name = "ICON", nullable = false)
    protected String icon;

    @Column(name = "COLOUR", nullable = false)
    protected String colour;

    public String getId() {
        return id;
    }

    @Override
    public T setId(String id) {
        this.id = id;
        return (T) this;
    }

    public String getName() {
        return name;
    }

    public T setName(String name) {
        this.name = name;
        return (T) this;
    }

    public String getIcon() {
        return icon;
    }

    public T setIcon(String icon) {
        this.icon = icon;
        return (T) this;
    }


    public String getColour() {
        return colour;
    }

    public T setColour(String colour) {
        this.icon = icon;
        return (T) this;
    }

    public AssetDescriptor<?> getAssetDescriptor() {
        return new AssetDescriptor<>(name, icon, colour, CustomAsset.class, true);
    }
}
